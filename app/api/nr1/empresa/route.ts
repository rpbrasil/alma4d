import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";


function isValidCNPJ(input: string): boolean {
  const cnpj = input.replace(/\D/g, "");

  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;

  const calcCheck = (base: string, factors: number[]) => {
    const sum = base
      .split("")
      .reduce((acc, digit, i) => acc + Number(digit) * factors[i], 0);

    const result = sum % 11;
    return result < 2 ? 0 : 11 - result;
  };

  const base = cnpj.slice(0, 12);

  const d1 = calcCheck(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calcCheck(base + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

  return d1 === Number(cnpj[12]) && d2 === Number(cnpj[13]);
}

const EmpresaSchema = z.object({
  razaoSocial: z.string().min(2).max(200),
  cnpj: z
    .string()
    .regex(/^\d{14}$/, "CNPJ deve conter 14 dígitos")
    .refine((v) => isValidCNPJ(v), "CNPJ inválido"),
  email: z.string().email(),
  telefone: z
    .string()
    .regex(/^\+\d{10,15}$/, "Telefone deve estar em E.164 (+5511...)"),
  responsavel: z.string().min(2).max(160),
  funcionarios: z.number().int().min(1).max(200000),
  aceiteLgpd: z.boolean().refine((v) => v === true, "LGPD deve ser aceita"),
  cupom: z.string().trim().min(3).max(40).optional().or(z.literal("")),
});

type EmpresaPayload = z.infer<typeof EmpresaSchema>;

function isoDateYYYYMMDD(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function normalizeEmail(v: string) {
  return v.trim().toLowerCase();
}

function mkNumeroContrato() {
  // único e legível o suficiente para teste/produção
  // (se quiser, depois substitui por sequência/numeração oficial)
  return `NR1-${isoDateYYYYMMDD()}-${Date.now()}`;
}

function isUniqueViolationMsg(msg: string, token: string) {
  return (msg || "").toLowerCase().includes(token.toLowerCase());
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

    // =========================================================
    // 0) Idempotência: se usuário já tem cliente_id, reutiliza
    // =========================================================
    const { data: existingUser, error: existingUserErr } = await supabase
      .from("usuarios")
      .select("id, cliente_id, role")
      .eq("id", userId)
      .maybeSingle();

    if (existingUserErr) {
      return NextResponse.json(
        { error: "Falha ao verificar usuário.", detail: existingUserErr },
        { status: 500 },
      );
    }

    // helper: garante que existe um contrato rascunho NR‑1 (ou cria)
    async function ensureContratoRascunho(clienteId: string) {
      const { data: existingContrato, error: exContrErr } = await supabase
        .from("contratos")
        .select("id")
        .eq("cliente_id", clienteId)
        .eq("tipo_contrato", "nr1_psicossocial")
        .eq("status", "rascunho")
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (exContrErr) {
        throw exContrErr;
      }

      if (existingContrato?.id) {
        return existingContrato.id as string;
      }

      const observacoes = JSON.stringify({
        origem: "nr1",
        responsavel: body.responsavel.trim(),
        funcionarios: body.funcionarios,
        aceite_lgpd: true,
        cupom: body.cupom ? body.cupom.trim() : null,
        created_via: "self_service",
      });

      const { data: contrato, error: contratoError } = await supabase
        .from("contratos")
        .insert({
          cliente_id: clienteId,
          numero_contrato: mkNumeroContrato(),
          tipo_contrato: "nr1_psicossocial",
          status: "rascunho",
          data_inicio: isoDateYYYYMMDD(),
          criado_por: userId,

          limite_usuarios: body.funcionarios,

          valor_total: null,
          valor_mensal: null,
          forma_pagamento: "pagarme",

          observacoes,
        })
        .select("id")
        .single();

      if (contratoError) throw contratoError;
      return contrato.id as string;
    }

    // Se já tem cliente_id, apenas garante contrato e retorna
    if (existingUser?.cliente_id) {
      const clienteId = existingUser.cliente_id as string;

      // garante que o role seja "cliente" (sem travar se já for)
      // se suas policies de SELECT dependem do role, isso ajuda bastante
      await supabase
        .from("usuarios")
        .update({
          role: "cliente",
          telefone: body.telefone,
          email: normalizeEmail(body.email),
          nome_completo: body.responsavel.trim(),
          ativo: false,
          aceitou_termos: true,
          premium_origem: "pagarme",
        })
        .eq("id", userId);

      const contratoId = await ensureContratoRascunho(clienteId);

      return NextResponse.json(
        {
          success: true,
          reused: true,
          cliente_id: clienteId,
          contrato_id: contratoId,
        },
        { status: 200 },
      );
    }

    // =========================================================
    // 1) cria cliente PJ (empresa) — INATIVO até pagamento
    // =========================================================
    const { data: cliente, error: clienteError } = await supabase
      .from("clientes")
      .insert({
        tipo: "pj",
        nome: body.razaoSocial.trim(),
        documento: body.cnpj,
        email: normalizeEmail(body.email),
        telefone: body.telefone,
        ativo: false,
      })
      .select("id")
      .single();

    if (clienteError) {
      const msg = clienteError.message ?? "";

      if (isUniqueViolationMsg(msg, "clientes_email_unique")) {
        return NextResponse.json(
          { error: "E-mail já cadastrado para outro cliente." },
          { status: 409 },
        );
      }
      if (isUniqueViolationMsg(msg, "clientes_telefone_unique")) {
        return NextResponse.json(
          { error: "Telefone já cadastrado para outro cliente." },
          { status: 409 },
        );
      }
      if (
        isUniqueViolationMsg(msg, "clientes_cpf_key") ||
        msg.toLowerCase().includes("documento")
      ) {
        return NextResponse.json(
          { error: "CNPJ já cadastrado para outro cliente." },
          { status: 409 },
        );
      }

      // 🔎 devolve detalhe para debug (você pode remover depois)
      return NextResponse.json(
        { error: "Falha ao criar cliente.", detail: clienteError },
        { status: 500 },
      );
    }

    const clienteId = cliente.id as string;

    // =========================================================
    // 2) vincula usuário autenticado ao cliente (CRÍTICO p/ RLS de contratos)
    // =========================================================
    // Obs: usamos upsert por id (auth.uid) e já setamos cliente_id
    const { error: usuarioError } = await supabase.from("usuarios").upsert(
      {
        id: userId,
        cliente_id: clienteId,
        role: "cliente",
        ativo: false,
        telefone: body.telefone,
        email: normalizeEmail(body.email),
        nome_completo: body.responsavel.trim(),
        aceitou_termos: true,
        premium_origem: "pagarme",
      },
      { onConflict: "id" },
    );

    if (usuarioError) {
      // Sem rollback frágil (delete cliente pode falhar por RLS).
      // Deixa consistente para retry (idempotência pegará cliente_id depois que o usuário for atualizado).
      return NextResponse.json(
        {
          error: "Falha ao vincular usuário ao cliente.",
          detail: usuarioError,
        },
        { status: 500 },
      );
    }

    // =========================================================
    // 3) cria (ou garante) contrato NR‑1 rascunho (idempotente)
    // =========================================================
    let contratoId: string;
    try {
      contratoId = await ensureContratoRascunho(clienteId);
    } catch (e: unknown) {
      return NextResponse.json(
        { error: "Falha ao criar contrato.", detail: e },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        cliente_id: clienteId,
        contrato_id: contratoId,
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
