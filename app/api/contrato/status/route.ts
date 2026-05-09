import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type PagarmeStatusResponse = {
  order?: {
    id?: string;
    status?: string;
    amount?: number;
    charges?: Array<{
      payment_method?: string;
    }>;
  };
  error?: string;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const contratoId = searchParams.get("contratoId") || "";
  const orderId = searchParams.get("orderId") || ""; // opcional

  if (!contratoId) {
    return NextResponse.json(
      { error: "contratoId é obrigatório" },
      { status: 400 },
    );
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // ✅ busca contrato com colunas do seu schema
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
      aceite_termos,
      aceite_termos_em,
      aceite_ip,
      versao_termos,
      aceite_user_agent
    `,
    )
    .eq("id", contratoId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!contrato) {
    return NextResponse.json(
      { error: "Contrato não encontrado" },
      { status: 404 },
    );
  }

  // ✅ complemento opcional: status do pagamento via seu endpoint existente
  // só funciona se vier orderId na URL
  let pagamento: {
    order_id: string;
    status?: string | null;
    amount?: number | null;
    method?: string | null;
  } | null = null;

  if (orderId) {
    const origin = new URL(req.url).origin;
    const r = await fetch(
      `${origin}/api/nr1/pagamento/status?order_id=${encodeURIComponent(orderId)}`,
      {
        cache: "no-store",
      },
    ).catch(() => null);

    if (r && r.ok) {
      const j = (await r.json().catch(() => ({}))) as PagarmeStatusResponse;
      pagamento = {
        order_id: orderId,
        status: j?.order?.status ?? null,
        amount: j?.order?.amount ?? null,
        method: j?.order?.charges?.[0]?.payment_method ?? null,
      };
    } else {
      pagamento = {
        order_id: orderId,
        status: "unknown",
        amount: null,
        method: null,
      };
    }
  }

  return NextResponse.json({ contrato, pagamento });
}
