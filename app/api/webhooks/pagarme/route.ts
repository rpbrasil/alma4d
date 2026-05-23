// app/api/pagarme/webhook/route.ts
import { NextResponse } from "next/server";
import {
  extractGatewayData,
  PagarmeWebhook,
  verifySignature,
} from "@/lib/pagarme";
import {
  activateContrato,
  getContrato,
  markFailOrCancel,
  markPixPending,
  supabaseAdmin,
  alreadyProcessedEvent,
} from "@/lib/contratos-flow";

export async function POST(req: Request) {
  // 1) Body raw (Buffer) para assinatura
  const raw = Buffer.from(await req.arrayBuffer());

  // 2) Verifica assinatura
  const sig = verifySignature({ rawBody: raw, headers: req.headers });
  if (!sig.ok) {
    return NextResponse.json(
      { error: "Assinatura inválida", reason: sig.reason },
      { status: 401 },
    );
  }

  // 3) Parse JSON
  let evt: PagarmeWebhook;
  try {
    evt = JSON.parse(raw.toString("utf8"));
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  // 4) Extrai dados normalizados
  const g = extractGatewayData(evt);
  const eventType = g.eventType;

  // Eventos mais comuns (documentados): order.paid, order.payment_failed, order.canceled... [1](https://docs.pagar.me/docs/webhooks)
  const isPaidEvent = eventType === "order.paid" || eventType === "charge.paid";
  const isFailEvent =
    eventType === "order.payment_failed" ||
    eventType === "charge.payment_failed";
  const isCancelEvent =
    eventType === "order.canceled" || eventType === "checkout.canceled";

  // Opcional: marcar pix pendente se vier status pending (sem polling)
  const isPix = g.paymentMethod === "pix";
  const isPending =
    g.paymentStatus === "pending" || g.paymentStatus === "waiting_payment";

  if (!g.contratoId) {
    // Sem contrato_id: não temos o que fazer com segurança
    return NextResponse.json({
      ok: true,
      ignored: true,
      reason: "contrato_id ausente",
    });
  }

  // Se não é evento relevante e nem pix pendente -> ignora
  if (!isPaidEvent && !isFailEvent && !isCancelEvent && !(isPix && isPending)) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const supabase = supabaseAdmin();

  // 5) Carrega contrato
  const contrato = await getContrato(supabase, g.contratoId);
  if (!contrato) {
    return NextResponse.json({
      ok: true,
      ignored: true,
      reason: "Contrato não encontrado",
    });
  }

  // 6) Idempotência (best-effort)
  const seen = await alreadyProcessedEvent(supabase, g.contratoId, g.eventId);
  if (seen) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  // 7) Roteia
  try {
    if (isFailEvent || isCancelEvent) {
      await markFailOrCancel({
        supabase,
        contrato,
        contratoId: g.contratoId,
        pagarmeOrderId: g.orderId,
        pagarmePaymentStatus: g.paymentStatus,
        paymentMethod: g.paymentMethod,
        eventType,
        kind: isFailEvent ? "failed" : "canceled",
        eventId: g.eventId,
      });
      return NextResponse.json({ ok: true, updated: true });
    }

    if (isPix && isPending && !isPaidEvent) {
      await markPixPending({
        supabase,
        contratoId: g.contratoId,
        pagarmeOrderId: g.orderId,
        pagarmePaymentStatus: g.paymentStatus,
        eventType,
        eventId: g.eventId,
      });
      return NextResponse.json({ ok: true, pix_pending: true });
    }

    // Paid
    await activateContrato({
      supabase,
      contrato,
      contratoId: g.contratoId,
      pagarmeOrderId: g.orderId,
      pagarmePaymentStatus: g.paymentStatus ?? "paid",
      paymentMethod: g.paymentMethod,
      eventType,
      eventId: g.eventId,
      cupomFromGateway: g.cupomCodigo,
    });

    return NextResponse.json({
      ok: true,
      activated: true,
      contrato_id: g.contratoId,
    });
  } catch (err) {
    // webhook deve responder 200 pra evitar retry infinito se seu erro for interno,
    // mas aqui você decide: eu retornaria 200 e logaria.
    console.error("Webhook error:", err);
    return NextResponse.json({ ok: true, internal_error: true });
  }
}
