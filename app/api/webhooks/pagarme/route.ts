// app/api/webhooks/pagarme/route.ts
import { NextResponse } from "next/server";
import {
  extractGatewayData,
  PagarmeWebhook,
  verifySignature,
} from "@/lib/pagarme";
import {
  activateContratoFull,
  getContrato,
  markFailOrCancel,
  markPixPending,
  supabaseAdmin,
  alreadyProcessedEvent,
  recordWebhookEvent,
} from "@/lib/contratos-flow";


function expectedCentsFromContrato(c: {
  valor_mensal?: number | string | null;
  valor_total?: number | string | null;
}): number | null {
  const base = c.valor_mensal ?? c.valor_total ?? null;

  if (base == null) return null;

  const n = typeof base === "string" ? Number(base) : base;
  if (!Number.isFinite(n)) return null;

  return Math.round(n * 100);
}

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

  const isPaidEvent = eventType === "order.paid" || eventType === "charge.paid";
  const isFailEvent =
    eventType === "order.payment_failed" ||
    eventType === "charge.payment_failed";
  const isCancelEvent =
    eventType === "order.canceled" || eventType === "checkout.canceled";

  // Pix pending (sem polling)
  const isPix = g.paymentMethod === "pix";
  const isPending =
    g.paymentStatus === "pending" || g.paymentStatus === "waiting_payment";

  if (!g.contratoId) {
    return NextResponse.json({
      ok: true,
      ignored: true,
      reason: "contrato_id ausente",
    });
  }

  // Se não é evento relevante e nem pix pending -> ignora
  if (!isPaidEvent && !isFailEvent && !isCancelEvent && !(isPix && isPending)) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const supabase = supabaseAdmin();

  // 5) Carrega contrato
  const contrato = await getContrato(supabase, g.contratoId);
const contratoForCheck = contrato as {
  valor_mensal?: number | string | null;
  valor_total?: number | string | null;
};
  if (!contrato) {
    return NextResponse.json({
      ok: true,
      ignored: true,
      reason: "Contrato não encontrado",
    });
  }

  // 6) Hardening: validar vínculo order_id (se contrato já tem)
  // (evita evento de outro pedido ativar contrato errado)
  if (contrato.pagarme_order_id && g.orderId) {
    if (String(contrato.pagarme_order_id) !== String(g.orderId)) {
      await recordWebhookEvent(supabase, {
        contrato_id: g.contratoId,
        tipo: "webhook_mismatch_order",
        gateway_event_id: g.eventId,
        dados: {
          eventType,
          received_order_id: g.orderId,
          expected_order_id: contrato.pagarme_order_id,
          g,
        },
      });

      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: "order_id mismatch",
      });
    }
  }

  // 7) Idempotência
  const seen = await alreadyProcessedEvent(supabase, g.contratoId, g.eventId);
  if (seen) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  // 8) Auditoria: registra sempre o evento recebido (antes de aplicar efeitos)
  await recordWebhookEvent(supabase, {
    contrato_id: g.contratoId,
    tipo: `webhook_${eventType || "unknown"}`,
    gateway_event_id: g.eventId,
    dados: { g, raw_event_id: evt.id ?? null, raw_type: evt.type ?? null },
  });

  // 9) Roteia
  try {
    // FAIL / CANCEL
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

    // PIX pending
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

    // ✅ Hardening: valida valor (se houver amountCents no payload E valor no contrato)
   const expected = expectedCentsFromContrato(contratoForCheck);
    const got = g.amountCents ?? null;

    if (expected != null && got != null && expected !== got) {
      await recordWebhookEvent(supabase, {
        contrato_id: g.contratoId,
        tipo: "webhook_amount_mismatch",
        gateway_event_id: g.eventId,
        dados: { expected_cents: expected, got_cents: got, g },
      });

      // Produção: NÃO ativa se valor divergir
      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: "amount mismatch",
      });
    }

    // ✅ PAGO: fluxo completo (contrato + cliente + usuário + nfse + pdf)
    const activated = await activateContratoFull({
      supabase,
      contratoId: g.contratoId,
      pagarmeOrderId: g.orderId,
      pagarmePaymentStatus: g.paymentStatus ?? "paid",
      paymentMethod: g.paymentMethod,
      eventType,
      eventId: g.eventId,
      cupomFromGateway: g.cupomCodigo,
    });

    // ✅ Email dedicado (edge function payment-email)
    try {
      const base =
        process.env.PAYMENT_EMAIL_FUNCTION_URL ??
        `${process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/payment-email`;

      await fetch(base, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          tipo: "pagamento_confirmado",
          contrato_id: g.contratoId,
          pagarme_order_id: g.orderId,
          payment_method: g.paymentMethod,
          dashboard_url:
            process.env.APP_DASHBOARD_URL ??
            `${process.env.BASE_URL}/dashboard`,
          express_url:
            process.env.APP_EXPRESS_URL ?? `${process.env.BASE_URL}/express`,
        }),
      });
    } catch (err) {
      console.error("Erro ao enviar email:", err);
      await recordWebhookEvent(supabase, {
        contrato_id: g.contratoId,
        tipo: "email_pagamento_confirmado_falhou",
        gateway_event_id: g.eventId,
        dados: { error: String(err) },
      });
    }

    return NextResponse.json({
      ok: true,
      activated: true,
      contrato_id: g.contratoId,
      already_active: activated.alreadyActive ?? false,
    });
  } catch (err) {
    console.error("Webhook error:", err);
    await recordWebhookEvent(supabase, {
      contrato_id: g.contratoId,
      tipo: "webhook_internal_error",
      gateway_event_id: g.eventId,
      dados: { error: String(err) },
    });

    // responde 200 para evitar retry infinito por erro interno seu
    return NextResponse.json({ ok: true, internal_error: true });
  }
}
