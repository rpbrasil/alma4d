import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getConfigInternal } from "@/lib/precificacao/config-core";
import { calcularPrecificacao } from "@/(nr1)/nr1/_components/ModeloPrecificacaoExpress";
import { validarCupom } from "@/lib/cupons/validarcupom";

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
    .regex(/^\d{14}$/)
    .refine((v) => isValidCNPJ(v), "CNPJ inválido"),
  email: z.string().email(),
  telefone: z
    .string()
    .regex(/^\+\d{10,15}$/, "Telefone deve estar em E.164 (+5511...)"),
  responsavel: z.string().min(2).max(160),
  funcionarios: z.number().int().min(2).max(200000),
  aceiteLgpd: z.boolean().refine((v) => v === true, "LGPD deve ser aceita"),
  cupom: z.string().trim().min(3).max(40).optional().or(z.literal("")),
  risco: z.enum(["baixo", "medio", "alto"]).optional(),
  uf: z
    .string()
    .trim()
    .length(2)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),

  preco_client_total_final_cents: z.number().int().nonnegative().optional(),
  desconto_client_cents: z.number().int().nonnegative().optional(),
});

type EmpresaPayload = z.infer<typeof EmpresaSchema>;

function isoDateYYYYMMDD(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function normalizeEmail(v: string) {
  return v.trim().toLowerCase();
}

function mkNumeroContrato() {
  return `NR1-${isoDateYYYYMMDD()}-${Date.now()}`;
}

function serializeDbError(err: unknown) {
  const e = err as {
    message?: string;
    details?: string;
    hint?: string;
    code?: string;
  };

  return {
    message: e?.message ?? "Erro desconhecido",
    details: e?.details ?? null,
    hint: e?.hint ?? null,
    code: e?.code ?? null,
  };
}

function isUniqueViolation(err: unknown) {
  const e = err as { code?: string; message?: string };
  return (
    e?.code === "23505" ||
    (e?.message ?? "").toLowerCase().includes("duplicate key")
  );
}

export async function POST(req: Request) {
  try {
    const authSupabase = await createServerSupabase();
    const adminDb = getSupabaseAdmin();

    const json = (await req.json()) as unknown;
    const parsed = EmpresaSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const body: EmpresaPayload = parsed.data;

    // ✅ autenticação usa client da sessão
    const { data: authData, error: authErr } =
      await authSupabase.auth.getUser();

    if (authErr || !authData.user?.id) {
      return NextResponse.json(
        { error: "Sessão não encontrada. Valide o telefone novamente." },
        { status: 401 },
      );
    }

    const userId = authData.user.id;

    // ✅ operações de domínio usam admin
    const { data: existingUser, error: existingUserErr } = await adminDb
      .from("usuarios")
      .select("id, cliente_id, role")
      .eq("id", userId)
      .maybeSingle();

    if (existingUserErr) {
      return NextResponse.json(
        {
          error: "Falha ao verificar usuário.",
          detail: serializeDbError(existingUserErr),
        },
        { status: 500 },
      );
    }

    let config: Awaited<ReturnType<typeof getConfigInternal>>;
    try {
      config = await getConfigInternal("express");
    } catch (e: unknown) {
      return NextResponse.json(
        {
          error: "Falha ao carregar configuração de preço.",
          detail: serializeDbError(e),
        },
        { status: 500 },
      );
    }

    if (!config) {
      return NextResponse.json(
        { error: "Configuração de preço indisponível." },
        { status: 500 },
      );
    }

    const risco = body.risco ?? "medio";
    const uf = body.uf ?? null;
    const quote = calcularPrecificacao(body.funcionarios, risco, config, uf);

    let totalFinalCents = quote.totalMensalCents;
    let descontoCents = 0;
    let cupomAplicado: string | null = null;

    const cupom = (body.cupom ?? "").trim().toUpperCase();
    if (cupom) {
      try {
        const applied = await validarCupom({
          codigo: cupom,
          totalMensalCents: quote.totalMensalCents,
          plano: "express",
        });

        cupomAplicado = applied.codigo;
        descontoCents = applied.descontoCents;
        totalFinalCents = applied.totalComDescontoCents;
      } catch (e: unknown) {
        // fallback silencioso para não travar compra
        console.error("Erro ao validar cupom no endpoint NR1:", e);
        cupomAplicado = null;
        descontoCents = 0;
        totalFinalCents = quote.totalMensalCents;
      }
    }

    if (
      typeof body.preco_client_total_final_cents === "number" &&
      body.preco_client_total_final_cents !== totalFinalCents
    ) {
      console.warn("Preço client diverge do server", {
        client: body.preco_client_total_final_cents,
        server: totalFinalCents,
        userId,
      });
    }

    async function ensureContratoRascunho(clienteId: string) {
      const { data: existingContrato, error: exContrErr } = await adminDb
        .from("contratos")
        .select("id, valor_mensal, observacoes, cupom_codigo")
        .eq("cliente_id", clienteId)
        .eq("tipo_contrato", "nr1_psicossocial")
        .eq("status", "rascunho")
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (exContrErr) throw exContrErr;

      const observacoes = JSON.stringify({
        origem: "nr1",
        responsavel: body.responsavel.trim(),
        funcionarios: body.funcionarios,
        aceite_lgpd: true,
        cupom: cupomAplicado,
        created_via: "self_service",
        precificacao: {
          risco,
          uf,
          total_base_cents: quote.totalMensalCents,
          desconto_cents: descontoCents,
          total_final_cents: totalFinalCents,
          preco_por_usuario_cents: Math.round(
            totalFinalCents / Math.max(quote.n, 1),
          ),
        },
      });

      const valorMensal = totalFinalCents / 100;

      if (existingContrato?.id) {
        const currentValor =
          existingContrato.valor_mensal == null
            ? null
            : Number(existingContrato.valor_mensal);

        const needsUpdate =
          currentValor == null ||
          Math.abs(currentValor - valorMensal) > 0.00001 ||
          existingContrato.cupom_codigo !== cupomAplicado ||
          existingContrato.observacoes == null;

        if (needsUpdate) {
          const { error: updErr } = await adminDb
            .from("contratos")
            .update({
              valor_mensal: valorMensal,
              cupom_codigo: cupomAplicado,
              observacoes,
              limite_usuarios: body.funcionarios,
              atualizado_em: new Date().toISOString(),
            })
            .eq("id", existingContrato.id);

          if (updErr) throw updErr;
        }

        return existingContrato.id as string;
      }

      const { data: contrato, error: contratoError } = await adminDb
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
          valor_mensal: valorMensal,
          forma_pagamento: "pagarme",
          cupom_codigo: cupomAplicado,
          observacoes,
        })
        .select("id")
        .single();

      if (contratoError) throw contratoError;
      return contrato.id as string;
    }

    // ✅ usuário já vinculado a cliente
    if (existingUser?.cliente_id) {
      const clienteId = existingUser.cliente_id as string;

      const { error: updateUserError } = await adminDb
        .from("usuarios")
        .update({
          role: "cliente",
          telefone: body.telefone,
          email: normalizeEmail(body.email),
          nome_completo: body.responsavel.trim(),
          ativo: false,
          aceitou_termos: true,
          premium_origem: "pagarme",
          tipo_plano: "express",
        })
        .eq("id", userId);

      if (updateUserError) {
        return NextResponse.json(
          {
            error: "Falha ao atualizar vínculo do usuário.",
            detail: serializeDbError(updateUserError),
          },
          { status: 500 },
        );
      }

      const contratoId = await ensureContratoRascunho(clienteId);

      return NextResponse.json(
        {
          success: true,
          cliente_id: clienteId,
          contrato_id: contratoId,
          precificacao: {
            total_final_cents: totalFinalCents,
            desconto_cents: descontoCents,
            cupom: cupomAplicado,
            total_base_cents: quote.totalMensalCents,
          },
        },
        { status: 200 },
      );
    }

    // ✅ cria cliente
    const { data: cliente, error: clienteError } = await adminDb
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
      if (isUniqueViolation(clienteError)) {
        const msg = (clienteError.message ?? "").toLowerCase();

        if (msg.includes("email")) {
          return NextResponse.json(
            { error: "E-mail já cadastrado para outro cliente." },
            { status: 409 },
          );
        }

        if (msg.includes("telefone")) {
          return NextResponse.json(
            { error: "Telefone já cadastrado para outro cliente." },
            { status: 409 },
          );
        }

        if (msg.includes("documento") || msg.includes("cnpj")) {
          return NextResponse.json(
            { error: "CNPJ já cadastrado para outro cliente." },
            { status: 409 },
          );
        }
      }

      return NextResponse.json(
        {
          error: "Falha ao criar cliente.",
          detail: serializeDbError(clienteError),
        },
        { status: 500 },
      );
    }

    const clienteId = cliente.id as string;

    const { error: usuarioError } = await adminDb.from("usuarios").upsert(
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
        tipo_plano: "express",
        data_inicio_plano: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    if (usuarioError) {
      return NextResponse.json(
        {
          error: "Falha ao vincular usuário ao cliente.",
          detail: serializeDbError(usuarioError),
        },
        { status: 500 },
      );
    }

    let contratoId: string;
    try {
      contratoId = await ensureContratoRascunho(clienteId);
    } catch (e: unknown) {
      return NextResponse.json(
        {
          error: "Falha ao criar contrato.",
          detail: serializeDbError(e),
        },
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
    console.error("Erro ao processar cadastro NR-1:", err);

    return NextResponse.json(
      {
        error: "Erro ao processar cadastro NR‑1.",
        detail: serializeDbError(err),
      },
      { status: 500 },
    );
  }
}
