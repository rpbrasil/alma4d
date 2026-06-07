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
  supabaseAdmin,
} from "@/lib/contratos-flow";
import { gerarContratoPdfInterno } from "@/lib/contrato-pdf";

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
  const raw = Buffer.from(await req.arrayBuffer());

  // ✅ assinatura
  if (process.env.PAGARME_WEBHOOK_SECRET) {
    const sig = verifySignature({ rawBody: raw, headers: req.headers });
    if (!sig.ok) {
      return NextResponse.json(
        { error: "Assinatura inválida" },
        { status: 401 },
      );
    }
  }

  let evt: PagarmeWebhook;
  try {
    evt = JSON.parse(raw.toString("utf8"));
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const g = extractGatewayData(evt);
  const supabase = supabaseAdmin();

  // 🔎 log estruturado (importante)
  console.log("[webhook:pagarme]", {
    event: evt.type,
    eventId: g.eventId,
    orderId: g.orderId,
    contratoId: g.contratoId,
    amount: g.amountCents,
    method: g.paymentMethod,
  });

  if (!g.contratoId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  // ✅ detecta upgrade
  const { data: upgradeRow } = g.orderId
    ? await supabase
        .from("contratos_upgrades")
        .select(
          "id, contrato_id, quantidade_adicional, limite_anterior, limite_novo, total_cents, pagarme_payment_status, paid_at",
        )
        .eq("pagarme_order_id", g.orderId)
        .maybeSingle()
    : { data: null };

  const isUpgrade = !!upgradeRow;

  // ✅ idempotência upgrade
  if (isUpgrade && upgradeRow?.paid_at) {
    return NextResponse.json({
      ok: true,
      ignored: true,
      reason: "upgrade already processed",
    });
  }

  // ✅ FAIL / CANCEL
  if (
    g.eventType === "order.payment_failed" ||
    g.eventType === "charge.payment_failed" ||
    g.eventType === "order.canceled" ||
    g.eventType === "checkout.canceled"
  ) {
    await markFailOrCancel({
      supabase,
      contratoId: g.contratoId,
      pagarmeOrderId: g.orderId,
      pagarmePaymentStatus: g.paymentStatus,
      paymentMethod: g.paymentMethod,
      eventType: g.eventType,
      kind: g.eventType.includes("canceled") ? "canceled" : "failed",
      eventId: g.eventId,
    });

    return NextResponse.json({ ok: true, updated: true });
  }

  // ✅ valida valor
  const got = g.amountCents ?? null;

  if (isUpgrade) {
    const expected = upgradeRow?.total_cents ?? null;

    if (expected != null && got != null && expected !== got) {
      console.warn("[webhook] upgrade amount mismatch", {
        expected,
        got,
      });

      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: "upgrade amount mismatch",
      });
    }
  } else {
    const contrato = await getContrato(supabase, g.contratoId);
    const expected = expectedCentsFromContrato(contrato ?? {});

    if (expected != null && got != null && expected !== got) {
      console.warn("[webhook] contrato amount mismatch", {
        expected,
        got,
      });

      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: "amount mismatch",
      });
    }
  }
  
  // ✅ PAGAMENTO CONFIRMADO
  if (g.eventType === "charge.paid" || g.eventType === "order.paid") {
    // 🔵 UPGRADE
    if (isUpgrade) {
      // ✅ atualizar upgrade corretamente
      await supabase
        .from("contratos_upgrades")
        .update({
          pagarme_payment_status: g.paymentStatus ?? "paid",
          paid_at: new Date().toISOString(),
        })
        .eq("id", upgradeRow.id);

      // ✅ log evento
      try {
        await supabase.from("contrato_eventos").insert({
          contrato_id: g.contratoId,
          tipo: "upgrade_confirmado",
          descricao: "Upgrade confirmado via webhook",
          dados: {
            orderId: g.orderId,
            paymentStatus: g.paymentStatus,
            amount: g.amountCents,
          },
          gateway_event_id: g.eventId,
        });
      } catch (e) {
        const msg = String(e);
        if (!msg.includes("duplicate")) throw e;
      }

      return NextResponse.json({
        ok: true,
        upgrade: true,
      });
    }

    // 🟢 ATIVAÇÃO
    const contrato = await getContrato(supabase, g.contratoId);

    // ✅ idempotência extra (contrato)
    if (contrato?.status === "ativo") {
      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: "already activated",
      });
    }

    await activateContratoFull({
      supabase,
      contratoId: g.contratoId,
      pagarmeOrderId: g.orderId,
      pagarmePaymentStatus: g.paymentStatus ?? "paid",
      paymentMethod: g.paymentMethod,
      eventType: g.eventType,
      eventId: g.eventId,
      cupomFromGateway: g.cupomCodigo ?? null,
    });

    try {
      await supabase.from("contrato_eventos").insert({
        contrato_id: g.contratoId,
        tipo: "contrato_ativado",
        descricao: "Contrato ativado via webhook",
        dados: {
          orderId: g.orderId,
          paymentStatus: g.paymentStatus,
          amount: g.amountCents,
        },
        gateway_event_id: g.eventId,
      });
    } catch (e) {
      const msg = String(e);
      if (!msg.includes("duplicate")) throw e;
    }

    await gerarContratoPdfInterno({
      supabase,
      contratoId: g.contratoId,
    });

    // ✅ DISPARA EMISSÃO NFSE
    try {
      await fetch(`${process.env.BASE_URL}/api/nfse/emitir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contrato_id: g.contratoId,
        }),
      });
    } catch (err) {
      console.error("Erro ao disparar NFSe:", err);
    }

    return NextResponse.json({
      ok: true,
      activated: true,
    });
  }

  return NextResponse.json({ ok: true });
}
