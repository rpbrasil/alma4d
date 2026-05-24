// app/api/pagarme/verificar-pix/route.ts
import { NextResponse } from "next/server";
import { fetchPagarmeOrder, PagarmeOrderResponse } from "@/lib/pagarme";
import {
  activateContrato,
  getContrato,
  supabaseAdmin,
} from "@/lib/contratos-flow";

type Body = {
  contrato_id?: string;
  pagarme_order_id?: string;
};

function firstCharge(order: PagarmeOrderResponse) {
  return Array.isArray(order.charges) ? order.charges[0] : undefined;
}

export async function POST(req: Request) {
  
  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    body = {};
  }

  const supabase = supabaseAdmin();

  let contratoId = body.contrato_id ?? null;
  let pagarmeOrderId = body.pagarme_order_id ?? null;

  if (!contratoId && !pagarmeOrderId) {
    return NextResponse.json(
      { error: "Envie contrato_id ou pagarme_order_id" },
      { status: 400 },
    );
  }

  if (!contratoId && pagarmeOrderId) {
    const { data } = await supabase
      .from("contratos")
      .select("id")
      .eq("pagarme_order_id", pagarmeOrderId)
      .limit(1)
      .maybeSingle();

    contratoId = data?.id ?? null;
  }

  if (!contratoId) {
    return NextResponse.json(
      { error: "Contrato não encontrado" },
      { status: 404 },
    );
  }

  const contrato = await getContrato(supabase, contratoId);
  if (!contrato) {
    return NextResponse.json(
      { error: "Contrato não encontrado" },
      { status: 404 },
    );
  }

  if (!pagarmeOrderId) {
    const { data } = await supabase
      .from("contratos")
      .select("pagarme_order_id")
      .eq("id", contratoId)
      .single();

    pagarmeOrderId = data?.pagarme_order_id ?? null;
  }

  if (!pagarmeOrderId) {
    return NextResponse.json(
      { error: "pagarme_order_id ausente no contrato" },
      { status: 400 },
    );
  }

  let order: PagarmeOrderResponse;
  try {
    order = await fetchPagarmeOrder(pagarmeOrderId);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Falha ao consultar Pagar.me", detail: msg },
      { status: 502 },
    );
  }

  const ch = firstCharge(order);
  const status = String(ch?.status ?? order.status ?? "").toLowerCase();
  const paymentMethod = String(ch?.payment_method ?? "").toLowerCase();

  const isPaid = status === "paid";
  const isPix = paymentMethod === "pix";

  if (!isPix) {
    return NextResponse.json({
      ok: true,
      checked: true,
      message: "Order não parece ser PIX (payment_method != pix).",
      pagarme_order_id: pagarmeOrderId,
      status,
      payment_method: paymentMethod,
    });
  }

  if (!isPaid) {
    return NextResponse.json({
      ok: true,
      checked: true,
      paid: false,
      pagarme_order_id: pagarmeOrderId,
      status,
      payment_method: paymentMethod,
    });
  }

  const cupomFromGatewayRaw = order.metadata?.["cupom_codigo"];
  const cupomFromGateway = cupomFromGatewayRaw
    ? String(cupomFromGatewayRaw).trim().toUpperCase()
    : null;

  await activateContrato({
    supabase,
    contrato,
    contratoId,
    pagarmeOrderId,
    pagarmePaymentStatus: status,
    paymentMethod,
    eventType: "manual.pix.verify",
    eventId: null,
    cupomFromGateway,
  });

  return NextResponse.json({
    ok: true,
    checked: true,
    paid: true,
    activated: true,
    contrato_id: contratoId,
    pagarme_order_id: pagarmeOrderId,
  });
}
