import { NextResponse } from "next/server";
import crypto from "crypto";

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

/* ================= HELPERS ================= */

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

function buildEventHash(g: ReturnType<typeof extractGatewayData>) {
  const base = [g.eventType, g.orderId, g.chargeId].filter(Boolean).join("|");

  return crypto.createHash("sha256").update(base).digest("hex");
}

/* ================= HANDLER ================= */

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

  // ✅ IDPOTÊNCIA (webhook_logs)
  const eventHash = buildEventHash(g);

  const { error: logInsertError } = await supabase.from("webhook_logs").insert({
    provider: "pagarme",
    event_type: g.eventType,
    order_id: g.orderId,
    contrato_id: g.contratoId,
    raw_event: evt,
    event_hash: eventHash,
  });

  if (logInsertError) {
    if (logInsertError.code === "23505") {
      return NextResponse.json({ ok: true, ignored: true });
    }
    throw logInsertError;
  }

  // ✅ evita duplicação lógica (IMPORTANTE)
  if (g.eventType === "charge.paid") {
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

  if (isUpgrade && upgradeRow?.paid_at) {
    await supabase
      .from("webhook_logs")
      .update({ processado: true })
      .eq("event_hash", eventHash);
    return NextResponse.json({ ok: true, ignored: true });
  }

  // ✅ FAIL / CANCEL
  if (
    g.eventType === "order.payment_failed" ||
    g.eventType === "order.canceled"
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

    //EMAIL FALHAS
    const emailRes = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/email_notify`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tipo: "pagamento_falhou",
          contrato_id: g.contratoId,
        }),
      },
    );

    if (!emailRes.ok) {
      console.error("Erro ao enviar email_notify", await emailRes.text());
    }
    await supabase
      .from("webhook_logs")
      .update({ processado: true })
      .eq("event_hash", eventHash);
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

  // ✅ PAGAMENTO CONFIRMADO (APENAS order.paid)
  if (g.eventType === "order.paid") {
    // =============================
    // ✅ FLUXO DE UPGRADE (ISOLADO)
    // =============================
    if (isUpgrade) {
      if (!upgradeRow?.paid_at) {
        // ✅ marca upgrade como pago
        await supabase
          .from("contratos_upgrades")
          .update({
            pagarme_payment_status: g.paymentStatus ?? "paid",
            paid_at: new Date().toISOString(),
          })
          .eq("id", upgradeRow.id);

        // ✅ EVITA DUPLICAÇÃO (idempotência financeira)
        const { data: lancamentoExistente } = await supabase
          .from("financeiro_lancamentos")
          .select("id")
          .eq("ref_externo", upgradeRow.pagarme_order_id)
          .maybeSingle();

        if (!lancamentoExistente) {
          await supabase.from("financeiro_lancamentos").insert({
            cliente_id: upgradeRow.cliente_id,
            contrato_id: upgradeRow.contrato_id,
            tipo: "receita",
            categoria: "upgrade_licencas",
            valor: upgradeRow.total_cents / 100,
            moeda: "BRL",

            descricao: `Upgrade de ${upgradeRow.quantidade_adicional} licenças`,

            data_competencia: new Date().toISOString(),
            data_pagamento: new Date().toISOString(),

            origem: "pagarme",
            ref_externo: upgradeRow.pagarme_order_id,

            metadata: {
              upgrade_id: upgradeRow.id,
              quantidade: upgradeRow.quantidade_adicional,
            },
          });
        }

        // ✅ atualiza contrato (fonte da verdade)
        await supabase
          .from("contratos")
          .update({
            limite_usuarios: upgradeRow.limite_novo,
            updated_at: new Date().toISOString(),
          })
          .eq("id", upgradeRow.contrato_id)
          .eq("status", "ativo")
          .or(
            `limite_usuarios.is.null,limite_usuarios.neq.${upgradeRow.limite_novo}`,
          );

        // ✅ NFSe idempotente para upgrade
        const refUpgrade = `nfse_upgrade_${upgradeRow.id}`;

        const { data: nfseExistente } = await supabase
          .from("nfse_emissoes")
          .select("id")
          .eq("ref", refUpgrade)
          .maybeSingle();

        if (!nfseExistente) {
          await fetch(`${process.env.BASE_URL}/api/nfse/emitir`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(10000),
            body: JSON.stringify({
              contrato_id: g.contratoId,
              ref: refUpgrade,
              tipo: "upgrade",
            }),
          });
        }
      }
      // email enviado
      const emailRes = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/email_notify`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tipo: "pagamento_confirmado",
            contrato_id: g.contratoId,
            dashboard_url: process.env.BASE_URL,
            express_url: `${process.env.BASE_URL}/dashboard/express`,
          }),
        },
      );

      if (!emailRes.ok) {
        console.error("Erro ao enviar email_notify", await emailRes.text());
      }

      // ✅ marca webhook como processado (sempre, mesmo em retry)
      await supabase
        .from("webhook_logs")
        .update({ processado: true })
        .eq("event_hash", eventHash);

      return NextResponse.json({ ok: true, upgrade: true });
    }

    // ==========================================
    // ✅ FLUXO NORMAL (CONTRATO NOVO / ATIVAÇÃO)
    // ==========================================

    const contrato = await getContrato(supabase, g.contratoId);

    // ✅ já ativo → ignora
    if (contrato?.status === "ativo") {
      await supabase
        .from("webhook_logs")
        .update({ processado: true })
        .eq("event_hash", eventHash);

      return NextResponse.json({ ok: true, ignored: true });
    }

    // ✅ ativa contrato completo
    await activateContratoFull({
      supabase,
      contratoId: g.contratoId,
      pagarmeOrderId: g.orderId,
      pagarmePaymentStatus: g.paymentStatus ?? "paid",
      cupomFromGateway: g.cupomCodigo ?? null,
      userId: g.userId,
    });

    const contratoAtual = await getContrato(supabase, g.contratoId);
    const ref = `nfse_${g.contratoId}_v${contratoAtual?.versao ?? 1}`;

    const { data: nfseExistente } = await supabase
      .from("nfse_emissoes")
      .select("id, status")
      .eq("ref", ref)
      .maybeSingle();

    const precisaEmitirNFSe = !nfseExistente || nfseExistente.status === "erro";

    const { data: contratoCupom } = await supabase
      .from("contratos")
      .select("cupom_codigo, desconto_cents, cupom_percentual, cliente_id")
      .eq("id", g.contratoId)
      .maybeSingle();

    if (contratoCupom?.cupom_codigo) {
      const { data: cupom } = await supabase
        .from("cupons")
        .select("id, parceiro_id, usos_total, comissao_percentual")
        .eq("codigo", contratoCupom.cupom_codigo)
        .maybeSingle();

      if (cupom) {
        const { count, error: countError } = await supabase
          .from("cupons_uso")
          .select("*", { count: "exact", head: true })
          .eq("cupom_id", cupom.id)
          .eq("cliente_id", contratoCupom.cliente_id);

        if (countError) {
          console.error("[CUPOM] erro ao verificar uso:", countError);
        }

        if ((count ?? 0) > 0) {
          console.warn("[CUPOM] uso duplicado detectado", {
            cupom_id: cupom.id,
            cliente_id: contratoCupom.cliente_id,
          });
        } else {
          await supabase
            .from("cupons")
            .update({
              usos_total: (cupom.usos_total ?? 0) + 1,
            })
            .eq("id", cupom.id);

          await supabase.from("cupons_uso").insert({
            cupom_id: cupom.id,
            cliente_id: contratoCupom.cliente_id,
            contrato_id: g.contratoId,
            valor_desconto: (contratoCupom.desconto_cents ?? 0) / 100,
            desconto_percentual: contratoCupom.cupom_percentual,
            cupom_codigo: contratoCupom.cupom_codigo,
            parceiro_id: cupom.parceiro_id,
            comissao_percentual: cupom.comissao_percentual,
          });
        }
      }
    }

    await Promise.all([
      precisaEmitirNFSe
        ? fetch(`${process.env.BASE_URL}/api/nfse/emitir`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(10000),
            body: JSON.stringify({
              contrato_id: g.contratoId,
            }),
          })
        : Promise.resolve(),
    ]);

    //ENVIO DE EMAIL SUCESSO CONTRATO INICIAL
    const emailRes = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/email_notify`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tipo: "pagamento_confirmado",
          contrato_id: g.contratoId,
          dashboard_url: process.env.BASE_URL,
          express_url: `${process.env.BASE_URL}/dashboard/express`,
        }),
      },
    );
    if (!emailRes.ok) {
      console.error("Erro ao enviar email_notify", await emailRes.text());
    }

    // ✅ marcar como processado
    await supabase
      .from("webhook_logs")
      .update({ processado: true })
      .eq("event_hash", eventHash);

    return NextResponse.json({
      ok: true,
      activated: true,
      nfse: precisaEmitirNFSe ? "emitindo" : "skipped",
    });
  }
}
