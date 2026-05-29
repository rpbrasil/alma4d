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
  applyContratoUpgrade,
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
  const raw = Buffer.from(await req.arrayBuffer());

  // ✅ assinatura (se configurado)
  if (process.env.PAGARME_WEBHOOK_SECRET) {
    const sig = verifySignature({ rawBody: raw, headers: req.headers });
    if (!sig.ok) {
      return NextResponse.json(
        { error: "Assinatura inválida" },
        { status: 401 },
      );
    }
  }

  // ✅ parse
  let evt: PagarmeWebhook;
  try {
    evt = JSON.parse(raw.toString("utf8"));
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const g = extractGatewayData(evt);
  const supabase = supabaseAdmin();

  if (!g.contratoId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  // ✅ detecta upgrade via order_id
  const { data: upgradeRow } = g.orderId
    ? await supabase
        .from("contratos_upgrades")
        .select("id, total_cents")
        .eq("pagarme_order_id", g.orderId)
        .maybeSingle()
    : { data: null };

  const isUpgrade = !!upgradeRow;

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
    const expected = Number(upgradeRow?.total_cents ?? 0);

    if (expected > 0 && got != null && expected !== got) {
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
      await applyContratoUpgrade({
        supabase,
        contratoId: g.contratoId,
        orderId: g.orderId,
        paymentStatus: g.paymentStatus ?? "paid",
      });

      return NextResponse.json({
        ok: true,
        upgrade: true,
      });
    }

    // 🟢 ATIVAÇÃO
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

    return NextResponse.json({
      ok: true,
      activated: true,
    });
  }

  // fallback
  return NextResponse.json({ ok: true });
}