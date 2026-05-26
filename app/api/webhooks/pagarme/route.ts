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
  const hasWebhookSecret = !!process.env.PAGARME_WEBHOOK_SECRET;

  if (hasWebhookSecret) {
    const sig = verifySignature({ rawBody: raw, headers: req.headers });

    if (!sig.ok) {
      return NextResponse.json(
        { error: "Assinatura inválida", reason: sig.reason },
        { status: 401 },
      );
    }
  } else {
    console.warn(
      "Webhook sem verificação de assinatura (PAGARME_WEBHOOK_SECRET não configurado)",
    );
  }

  // 3) Parse JSON
  let evt: PagarmeWebhook;
  try {
    evt = JSON.parse(raw.toString("utf8"));
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const rawEvent = evt;

  let eventHash: string | null = null;

  eventHash = await crypto.subtle
    .digest("SHA-256", new TextEncoder().encode(JSON.stringify(rawEvent)))
    .then((buf) =>
      Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""),
    );

  // 4) Extrai dados normalizados
  const g = extractGatewayData(evt);
  const eventType = g.eventType;

  const isPaidEvent = eventType === "order.paid" || eventType === "charge.paid";
  const isFailEvent =
    eventType === "order.payment_failed" ||
    eventType === "charge.payment_failed";
  const isCancelEvent =
    eventType === "order.canceled" || eventType === "checkout.canceled";

  const isPix = g.paymentMethod === "pix";
  const isPending =
    g.paymentStatus === "pending" || g.paymentStatus === "waiting_payment";

  const supabase = supabaseAdmin();

  if (!g.contratoId) {
    await recordWebhookEvent(supabase, {
      contrato_id: "unknown",
      tipo: "webhook_missing_contrato_id",
      gateway_event_id: g.eventId,
      dados: { g },
    });

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

  // helper local p/ marcar webhook_logs
  async function markWebhookLogFinal(params: {
    processado: boolean;
    erro?: string | null;
  }) {
    if (!eventHash) return;

    await supabase
      .from("webhook_logs")
      .update({
        processado: params.processado,
        erro: params.erro ?? null,
      })
      .eq("event_hash", eventHash);
  }

  // 5) Idempotência por HASH (webhook_logs)
  const { error: insertErr } = await supabase.from("webhook_logs").insert({
    provider: "pagarme",
    event_type: eventType,
    order_id: g.orderId,
    contrato_id: g.contratoId,
    raw_event: rawEvent,
    event_hash: eventHash,
  });

  if (insertErr) {
    const insertErrCode =
      insertErr && typeof insertErr === "object" && "code" in insertErr
        ? String((insertErr as { code?: unknown }).code ?? "")
        : "";

    // 23505 = unique violation (evento já processado / replay)
    if (insertErrCode === "23505") {
      console.log("Evento duplicado ignorado:", eventHash);

      return NextResponse.json({
        ok: true,
        duplicated: true,
      });
    }

    throw insertErr;
  }

  // 6) Carrega contrato
  const contrato = await getContrato(supabase, g.contratoId);
  const contratoForCheck = contrato ?? {};

  if (!contrato) {
    await markWebhookLogFinal({
      processado: true,
      erro: "Contrato não encontrado",
    });

    return NextResponse.json({
      ok: true,
      ignored: true,
      reason: "Contrato não encontrado",
    });
  }

  // 7) Hardening: validar vínculo order_id (se contrato já tem)
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

      await markWebhookLogFinal({
        processado: true,
        erro: "order_id mismatch",
      });

      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: "order_id mismatch",
      });
    }
  }

  // 8) Idempotência por eventId (contrato_eventos)
  const seen = await alreadyProcessedEvent(supabase, g.contratoId, g.eventId);
  if (seen) {
    await markWebhookLogFinal({ processado: true });

    return NextResponse.json({ ok: true, duplicate: true });
  }

  // 9) Auditoria: registra sempre o evento recebido (antes de aplicar efeitos)
  await recordWebhookEvent(supabase, {
    contrato_id: g.contratoId,
    tipo: `webhook_${eventType || "unknown"}`,
    gateway_event_id: g.eventId,
    dados: { g, raw_event_id: evt.id ?? null, raw_type: evt.type ?? null },
  });

  // 10) Roteia
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

      await markWebhookLogFinal({ processado: true });

      return NextResponse.json({ ok: true, updated: true });
    }

    // PIX pending
    if (isPix && isPending) {
      await markPixPending({
        supabase,
        contratoId: g.contratoId,
        pagarmeOrderId: g.orderId,
        pagarmePaymentStatus: g.paymentStatus,
        eventType,
        eventId: g.eventId,
      });

      await markWebhookLogFinal({ processado: true });

      return NextResponse.json({ ok: true, pix_pending: true });
    }

    // Hardening: valida valor
    const expected = expectedCentsFromContrato(contratoForCheck);
    const got = g.amountCents ?? null;

    if (expected != null && got != null && expected !== got) {
      await recordWebhookEvent(supabase, {
        contrato_id: g.contratoId,
        tipo: "webhook_amount_mismatch",
        gateway_event_id: g.eventId,
        dados: {
          expected_cents: expected,
          got_cents: got,
          order_id: g.orderId,
          payment_method: g.paymentMethod,
          payment_status: g.paymentStatus,
          event_type: eventType,
        },
      });

      await markWebhookLogFinal({
        processado: true,
        erro: "amount mismatch",
      });

      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: "amount mismatch",
      });
    }

    // PAGO: somente eventos paid
    if (isPaidEvent) {
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

      // Email apenas na primeira ativação
      if (!activated.alreadyActive) {
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
                process.env.APP_EXPRESS_URL ??
                `${process.env.BASE_URL}/express`,
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
      }

      await markWebhookLogFinal({ processado: true });

      return NextResponse.json({
        ok: true,
        activated: true,
        contrato_id: g.contratoId,
        already_active: activated.alreadyActive ?? false,
      });
    }

    await markWebhookLogFinal({ processado: true });

    return NextResponse.json({ ok: true, ignored: true });
  } catch (err) {
    console.error("Webhook error:", err);

    await recordWebhookEvent(supabase, {
      contrato_id: g.contratoId,
      tipo: "webhook_internal_error",
      gateway_event_id: g.eventId,
      dados: { error: String(err) },
    });

    await markWebhookLogFinal({
      processado: false,
      erro: String(err),
    });

    // sempre 200 para evitar retry infinito do gateway
    return NextResponse.json({ ok: true, internal_error: true });
  }
}
