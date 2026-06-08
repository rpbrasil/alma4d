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
        .select("*")
        .eq("pagarme_order_id", g.orderId)
        .maybeSingle()
    : { data: null };

  const isUpgrade = !!upgradeRow;

  // ✅ idempotência upgrade
  if (isUpgrade && upgradeRow?.paid_at) {
    return NextResponse.json({ ok: true, ignored: true });
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

    return NextResponse.json({ ok: true });
  }

  // ✅ valida valor
  const got = g.amountCents ?? null;

  if (isUpgrade) {
    const expected = upgradeRow?.total_cents ?? null;

    if (expected != null && got != null && expected !== got) {
      return NextResponse.json({ ok: true, ignored: true });
    }
  } else {
    const contrato = await getContrato(supabase, g.contratoId);
    const expected = expectedCentsFromContrato(contrato ?? {});

    if (expected != null && got != null && expected !== got) {
      return NextResponse.json({ ok: true, ignored: true });
    }
  }

  // ✅ PAGAMENTO CONFIRMADO
  if (g.eventType === "charge.paid" || g.eventType === "order.paid") {
    // 🔵 UPGRADE
    if (isUpgrade) {
      await supabase
        .from("contratos_upgrades")
        .update({
          pagarme_payment_status: g.paymentStatus ?? "paid",
          paid_at: new Date().toISOString(),
        })
        .eq("id", upgradeRow.id);

      return NextResponse.json({ ok: true, upgrade: true });
    }

    // 🟢 ATIVAÇÃO
    const contrato = await getContrato(supabase, g.contratoId);

    if (contrato?.status === "ativo") {
      return NextResponse.json({ ok: true, ignored: true });
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

    // ✅ pegar versão correta
    const contratoAtual = await getContrato(supabase, g.contratoId);

    const ref = `nfse_${g.contratoId}_v${contratoAtual?.versao ?? 1}`;

    const { data: nfseExistente } = await supabase
      .from("nfse_emissoes")
      .select("id, status")
      .eq("ref", ref)
      .maybeSingle();

    const precisaEmitirNFSe = !nfseExistente || nfseExistente.status === "erro";

    // ✅ execução paralela (correta)
    await Promise.all([
      gerarContratoPdfInterno({
        supabase,
        contratoId: g.contratoId,
      }),

      precisaEmitirNFSe
        ? fetch(`${process.env.BASE_URL}/api/nfse/emitir`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            signal: AbortSignal.timeout(10000),
            body: JSON.stringify({
              contrato_id: g.contratoId,
            }),
          })
        : Promise.resolve(),
    ]);

    return NextResponse.json({
      ok: true,
      activated: true,
      nfse: precisaEmitirNFSe ? "emitindo" : "skipped",
    });
  }

  return NextResponse.json({ ok: true });
}
