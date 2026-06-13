import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getConfigInternal } from "@/lib/precificacao/config-core";
import { calcularPrecificacao } from "@/(nr1)/nr1/_components/ModeloPrecificacaoExpress";
import { validarCupom } from "@/lib/cupons/validarcupom";

type RpcResult = {
  cliente_id: string;
  usuario_id: string;
  contrato_id: string;
};

function normalizeRpcResult(u: unknown): string | null {
  if (u == null) return null;
  if (typeof u === "string") return u;
  if (typeof u === "number") return String(u);
  if (Array.isArray(u) && u.length > 0) {
    const first = u[0];
    return (
      (typeof first === "string" && first) ||
      first?.usuario_id ||
      first?.current_usuario_id ||
      null
    );
  }
  if (typeof u === "object") {
    const record = u as Record<string, unknown>;
    return (
      (typeof record.usuario_id === "string" && record.usuario_id) ||
      (typeof record.current_usuario_id === "string" &&
        record.current_usuario_id) ||
      null
    );
  }
  return null;
}

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

export async function POST(req: Request) {
  try {
    const authSupabase = await createServerSupabase();
    const adminDb = getSupabaseAdmin();

    const json = await req.json();
    const parsed = EmpresaSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const body: EmpresaPayload = parsed.data;

    const { data: authData, error: authErr } =
      await authSupabase.auth.getUser();

    if (authErr || !authData.user?.id) {
      return NextResponse.json(
        { error: "Sessão não encontrada." },
        { status: 401 },
      );
    }

    // Resolver usuario_id canônico via RPC
    const { data: usuarioRpcData, error: usuarioRpcErr } =
      await authSupabase.rpc("current_usuario_id");

    if (usuarioRpcErr) {
      return NextResponse.json(
        { error: "usuario_nao_vinculado" },
        { status: 403 },
      );
    }

    const userId = normalizeRpcResult(usuarioRpcData);

    if (!userId) {
      return NextResponse.json(
        { error: "usuario_nao_vinculado" },
        { status: 403 },
      );
    }

    // ✅ cálculo preço
    const config = await getConfigInternal("express");
    if (!config) {
      return NextResponse.json(
        { error: "Configuração de preço indisponível." },
        { status: 500 },
      );
    }
    const quote = calcularPrecificacao(
      body.funcionarios,
      body.risco ?? "medio",
      config,
      body.uf ?? null,
    );

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
      } catch {
        // fallback
      }
    }

    const observacoes = {
      origem: "nr1",
      responsavel: body.responsavel,
      funcionarios: body.funcionarios,
      cupom: cupomAplicado,
      precificacao: {
        base: quote.totalMensalCents,
        desconto: descontoCents,
        final: totalFinalCents,
      },
    };
    const authUserId = authData.user.id;
    console.log("AUTH USER ID:", authUserId);
    // ✅ RPC CHAMADA
    const { data, error } = (await adminDb.rpc("nr1_criar_cliente", {
      p_auth_user_id: authUserId,
      p_razao_social: body.razaoSocial,
      p_cnpj: body.cnpj,
      p_email: body.email,
      p_telefone: body.telefone,
      p_responsavel: body.responsavel,
      p_funcionarios: body.funcionarios,
      p_valor_mensal: totalFinalCents / 100,
      p_observacoes: observacoes,
    })) as { data: RpcResult[] | null; error: unknown };

    if (error) {
      console.error("RPC ERROR:", error);
      return NextResponse.json(
        {
          error: "Erro ao processar cadastro.",
          detail: serializeDbError(error),
        },
        { status: 500 },
      );
    }

    if (!data || data.length === 0) {
      throw new Error("RPC retornou vazio");
    }

    const result = data[0];
    // ✅ persistir cupom no contrato (SE EXISTIR)
    if (cupomAplicado && result?.contrato_id) {
      try {
        // reusa dados do applied (já confiáveis)
        await adminDb
          .from("contratos")
          .update({
            cupom_codigo: cupomAplicado,
            desconto_cents: descontoCents,
            total_com_desconto_cents: totalFinalCents,
            cupom_percentual:
              descontoCents > 0
                ? (descontoCents / quote.totalMensalCents) * 100
                : 0,
          })
          .eq("id", result.contrato_id);
      } catch (err) {
        console.error("[CUPOM] erro ao persistir no contrato:", err);
      }
    }
    return NextResponse.json(
      {
        success: true,
        cliente_id: result.cliente_id,
        contrato_id: result.contrato_id,
        usuario_id: result.usuario_id,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("Erro NR1:", err);

    return NextResponse.json(
      {
        error: "Erro interno",
        detail: serializeDbError(err),
      },
      { status: 500 },
    );
  }
}
