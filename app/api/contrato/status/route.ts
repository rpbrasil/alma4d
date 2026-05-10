import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const contratoId = searchParams.get("contratoId") || "";

  // validação forte p/ uuid (evita /contrato/status etc.)
  if (!contratoId || contratoId.length !== 36) {
    return NextResponse.json({ error: "contratoId inválido" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

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
      aceite_user_agent,
      pagarme_order_id,
      pagarme_payment_status
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

  // ✅ pagamento vem do banco (sem fetch externo)
  const pagamento = contrato.pagarme_order_id
    ? {
        order_id: contrato.pagarme_order_id,
        status: contrato.pagarme_payment_status ?? "unknown",
        amount: null, // se quiser, pode salvar depois no contrato_eventos ou em coluna própria
        method: contrato.forma_pagamento ?? null,
      }
    : null;

  return NextResponse.json({ contrato, pagamento });
}
