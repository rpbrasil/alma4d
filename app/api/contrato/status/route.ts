import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type ContratoDbRow = {
  id: string;
  cliente_id: string;
  numero_contrato: string;
  versao: number;
  status: "rascunho" | "ativo" | "suspenso" | "encerrado";
  tipo_contrato: string;
  criado_em: string;
  atualizado_em: string;
  pdf_url: string | null;
  pdf_assinado_url: string | null;
  forma_pagamento: string | null;
  pagarme_order_id: string | null;
  pagarme_payment_status: string | null;
  valor_total: number | string | null;
  valor_mensal: number | string | null;
};

type PagamentoInfo = {
  order_id: string;
  status?: string | null;
  amount?: number | null;
  method?: string | null;
};

/**
 * Normaliza referências de PDF
 */
function normalizePdfReference(value: string | null): string | null {
  if (!value) return null;

  const v = value.trim();

  if (v.startsWith("http")) {
    try {
      const parsed = new URL(v);
      const pathSegments = parsed.pathname.split("/").filter(Boolean);

      const signIndex = pathSegments.findIndex((seg) => seg === "sign");
      if (signIndex >= 0 && pathSegments.length > signIndex + 2) {
        const objectPath = pathSegments.slice(signIndex + 2).join("/");
        return decodeURIComponent(objectPath);
      }

      const contratoIndex = pathSegments.findIndex((p) => p === "contratos");
      if (contratoIndex >= 0) {
        return pathSegments.slice(contratoIndex).join("/");
      }

      return v;
    } catch (e) {
      console.error("[normalizePdfReference] erro:", e);
      return v;
    }
  }

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

  if (uuidPattern.test(v)) {
    const parts = v.split("/");
    const contratoIndex = parts.findIndex((p) => p === "contratos");
    if (contratoIndex > 0) {
      return ["clientes", parts[0], ...parts.slice(contratoIndex)].join("/");
    }
  }

  return v;
}

function toCentsFromValorTotal(
  valor_total: number | string | null,
): number | null {
  if (valor_total == null) return null;

  const n = typeof valor_total === "string" ? Number(valor_total) : valor_total;

  if (Number.isNaN(n)) return null;

  return Math.round(n * 100);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const contratoId = searchParams.get("contratoId") || "";

    if (!contratoId || contratoId.length !== 36) {
      return NextResponse.json(
        { contrato: null, pagamento: null },
        { status: 200 },
      );
    }

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!token) {
      return NextResponse.json(
        { error: "Token ausente", contrato: null, pagamento: null },
        { status: 401 },
      );
    }

    const supabase = getSupabaseAdmin();

    // ✅ valida token
    const { data: userWrap, error: authErr } =
      await supabase.auth.getUser(token);

    if (authErr || !userWrap?.user?.id) {
      return NextResponse.json(
        { error: "Token inválido", contrato: null, pagamento: null },
        { status: 401 },
      );
    }

    const callerId = userWrap.user.id;

    // ✅ perfil do usuário
    const { data: caller } = await supabase
      .from("usuarios")
      .select("id, role, cliente_id")
      .eq("id", callerId)
      .maybeSingle();

    if (!caller) {
      return NextResponse.json(
        { error: "Sem permissão", contrato: null, pagamento: null },
        { status: 403 },
      );
    }

    const { data: contrato, error } = await supabase
      .from("contratos")
      .select(
        `
        id,
        cliente_id,
        numero_contrato,
        versao,
        status,
        tipo_contrato,
        criado_em,
        atualizado_em,
        pdf_url,
        pdf_assinado_url,
        forma_pagamento,
        pagarme_order_id,
        pagarme_payment_status,
        valor_mensal,
        valor_total

        `,
      )
      .eq("id", contratoId)
      .maybeSingle<ContratoDbRow>();

    if (error || !contrato) {
      return NextResponse.json(
        { contrato: null, pagamento: null },
        { status: 200 },
      );
    }

    const { data: lastEvt } = await supabase
      .from("contrato_eventos")
      .select("tipo, dados, created_at")
      .eq("contrato_id", contratoId)
      .in("tipo", ["pix_gerado", "boleto_gerado"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const isAdmin = caller.role === "admin";
    const sameTenant =
      String(caller.cliente_id || "") === String(contrato.cliente_id || "");

    if (!isAdmin && !sameTenant) {
      return NextResponse.json(
        { error: "Acesso negado", contrato: null, pagamento: null },
        { status: 403 },
      );
    }

    const contratoSanitizado = {
      ...contrato,
      pdf_url: normalizePdfReference(contrato.pdf_url),
      pdf_assinado_url: normalizePdfReference(contrato.pdf_assinado_url),
    };

    // ✅ fonte única: banco (SEM polling)
    const baseValor =
      contrato.valor_mensal != null
        ? Number(contrato.valor_mensal)
        : contrato.valor_total != null
          ? Number(contrato.valor_total)
          : null;
   
    const pagamento: PagamentoInfo | null = contrato.pagarme_order_id
      ? {
          order_id: contrato.pagarme_order_id,
          status: contrato.pagarme_payment_status ?? "unknown",
          amount: toCentsFromValorTotal(baseValor),
          method: contrato.forma_pagamento ?? null,
        }
      : null;
    const payment_artifacts = lastEvt?.dados ?? null;
    return NextResponse.json(
      { contrato: contratoSanitizado, pagamento, payment_artifacts },
      { status: 200 },
    );
  } catch (err) {
    console.error("[api/contrato/status] erro geral:", err);

    return NextResponse.json(
      { contrato: null, pagamento: null, payment_artifacts: null },
      { status: 200 },
    );
  }
}
