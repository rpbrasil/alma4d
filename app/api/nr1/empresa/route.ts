import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";

const EmpresaSchema = z.object({
  razaoSocial: z.string().min(2).max(200),
  cnpj: z.string().regex(/^\d{14}$/, "CNPJ deve conter 14 dígitos"),
  email: z.string().email(),
  telefone: z
    .string()
    .regex(/^\+\d{10,15}$/, "Telefone deve estar em E.164 (+5511...)"),
  responsavel: z.string().min(2).max(160),
  funcionarios: z.number().int().min(1).max(200000),
  aceiteLgpd: z.boolean().refine((v) => v === true, "LGPD deve ser aceita"),
  // já deixo pronto p/ etapa de cupom, sem obrigar agora:
  cupom: z.string().trim().min(3).max(40).optional().or(z.literal("")),
});

type EmpresaPayload = z.infer<typeof EmpresaSchema>;

function isoDateYYYYMMDD(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function normalizeEmail(v: string) {
  return v.trim().toLowerCase();
}

export async function POST(req: Request) {
  const supabase = await createServerSupabase();

  try {
    const json = (await req.json()) as unknown;
    const parsed = EmpresaSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const body: EmpresaPayload = parsed.data;

    // ✅ exige usuário autenticado (OTP já feito no public)
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData.user?.id) {
      return NextResponse.json(
        { error: "Sessão não encontrada. Valide o telefone novamente." },
        { status: 401 },
      );
    }

    const userId = authData.user.id;

    // (Opcional) reforço: se quiser garantir que telefone do auth bate com o informado
    // const authPhone = authData.user.phone ?? null;
    // if (authPhone && authPhone !== body.telefone) { ... }

    // 1) cria cliente PJ (empresa) — INATIVO até webhook de pagamento
    const { data: cliente, error: clienteError } = await supabase
      .from("clientes")
      .insert({
        tipo: "pj",
        nome: body.razaoSocial.trim(),
        documento: body.cnpj,
        email: normalizeEmail(body.email),
        telefone: body.telefone,
        ativo: false, // ✅ regra NR‑1
      })
      .select("id")
      .single();

    if (clienteError) {
      // mensagens amigáveis para suas constraints únicas
      const msg = clienteError.message?.toLowerCase() ?? "";
      if (msg.includes("clientes_email_unique")) {
        return NextResponse.json(
          { error: "E-mail já cadastrado para outro cliente." },
          { status: 409 },
        );
      }
      if (msg.includes("clientes_telefone_unique")) {
        return NextResponse.json(
          { error: "Telefone já cadastrado para outro cliente." },
          { status: 409 },
        );
      }
      if (msg.includes("clientes_cpf_key") || msg.includes("documento")) {
        return NextResponse.json(
          { error: "CNPJ já cadastrado para outro cliente." },
          { status: 409 },
        );
      }
      throw clienteError;
    }

    // 2) vincula usuário autenticado como responsável do cliente
    //    Observação: usuarios.id = auth.uid() pelo seu trigger; então upsert por id é perfeito.
    const { error: usuarioError } = await supabase.from("usuarios").upsert(
      {
        id: userId,
        cliente_id: cliente.id,
        role: "cliente",
        ativo: false, // acompanha cliente até pagamento
        telefone: body.telefone,
        email: normalizeEmail(body.email),
        nome_completo: body.responsavel.trim(),
        // documento aqui é do responsável (CPF). Você não pediu nesse estágio NR‑1, então NÃO seto.
        aceitou_termos: true,
        premium_origem: "pagarme",
      },
      { onConflict: "id" },
    );

    if (usuarioError) {
      // rollback: remove cliente criado (evita lixo e colisões)
      await supabase.from("clientes").delete().eq("id", cliente.id);
      throw usuarioError;
    }

    // 3) cria contrato NR‑1
    // contratos.observacoes é TEXT: vamos guardar JSON string para auditoria
    const observacoes = JSON.stringify({
      origem: "nr1",
      responsavel: body.responsavel.trim(),
      funcionarios: body.funcionarios,
      aceite_lgpd: true,
      cupom: body.cupom ? body.cupom.trim() : null,
    });

    const { data: contrato, error: contratoError } = await supabase
      .from("contratos")
      .insert({
        cliente_id: cliente.id,
        numero_contrato: `NR1-${Date.now()}`,
        tipo_contrato: "nr1_psicossocial",
        status: "rascunho",
        data_inicio: isoDateYYYYMMDD(),
        criado_por: userId,

        // ✅ amarra o limite de respostas ao nº de funcionários
        limite_usuarios: body.funcionarios,

        // valores serão definidos no passo de pagamento/cupom
        valor_total: null,
        valor_mensal: null,
        forma_pagamento: "pagarme",

        observacoes,
      })
      .select("id")
      .single();

    if (contratoError) {
      // rollback
      await supabase.from("clientes").delete().eq("id", cliente.id);
      throw contratoError;
    }

    // ✅ NÃO cria payment_links aqui (sua tabela exige payment_link_id/url NOT NULL)
    // Isso será feito no endpoint de "criar link pagarme" (passo seguinte).

    return NextResponse.json(
      {
        success: true,
        cliente_id: cliente.id,
        contrato_id: contrato.id,
      },
      { status: 200 },
    );
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json(
      { error: "Erro ao processar cadastro NR‑1." },
      { status: 500 },
    );
  }
}
