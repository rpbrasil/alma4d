import { NextResponse } from "next/server";
import crypto from "crypto";

import {
  extractGatewayData,
  PagarmeWebhook,
  verifySignature,
} from "@/lib/pagarme";

import {
  getContrato,
  markFailOrCancel,
  activateContratoFull,
} from "@/lib/contratos-flow";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

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
  // ✅ require secret config
  const expectedSecret = process.env.PAGARME_WEBHOOK_SECRET;
  const expectedUser = process.env.PAGARME_WEBHOOK_USER || "pagarme-webhook";

  if (!expectedSecret) {
    console.error("[webhook:pagarme] PAGARME_WEBHOOK_SECRET não configurado");
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 },
    );
  }

  // Basic Auth fallback: if provider only supports basic auth in dashboard
  let basicOk = false;
  try {
    const auth = req.headers.get("authorization");
    if (auth && auth.startsWith("Basic ")) {
      const decoded = Buffer.from(auth.slice(6), "base64").toString("utf8");
      const idx = decoded.indexOf(":");
      if (idx >= 0) {
        const user = decoded.slice(0, idx);
        const pass = decoded.slice(idx + 1);
        if (user === expectedUser && pass === expectedSecret) {
          basicOk = true;
        }
      }
    }
  } catch {
    // ignore parse errors and fallthrough to signature check
  }

  // HMAC signature validation (preferred). Accept if either HMAC OK or Basic Auth OK.
  const sig = verifySignature({ rawBody: raw, headers: req.headers });
  if (!sig.ok && !basicOk) {
    console.error(
      "[webhook:pagarme] assinatura inválida e Basic Auth falhou:",
      sig.reason,
    );
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  let evt: PagarmeWebhook;
  try {
    evt = JSON.parse(raw.toString("utf8"));
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const g = extractGatewayData(evt);
  const supabase = getSupabaseAdmin();

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
      `${process.env.SUPABASE_URL}/functions/v1/email_notify`,
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

    // ✅ registrar no processo
    if (emailRes.ok) {
      await supabase
        .from("pagamento_processos")
        .update({
          pagamento_falhou_enviado: true,
          pagamento_status: "failed",
        })
        .eq("contrato_id", g.contratoId);
    }

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
            headers: {
              "Content-Type": "application/json",
              "x-internal-secret": process.env.INTERNAL_API_SECRET ?? "",
            },
            signal: AbortSignal.timeout(10000),
            body: JSON.stringify({
              contrato_id: g.contratoId,
            }),
          });
          await supabase
            .from("pagamento_processos")
            .update({
              nfse_emitida: true,
            })
            .eq("contrato_id", g.contratoId);
        }
      }
      // email enviado
      const emailRes = await fetch(
        `${process.env.SUPABASE_URL}/functions/v1/email_notify`,
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

      // ✅ marcar no processo
      if (emailRes.ok) {
        await supabase
          .from("pagamento_processos")
          .update({
            pagamento_confirmado_enviado: true,
            pagamento_status: "paid",
          })
          .eq("contrato_id", g.contratoId);
      }

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
    // 1. Ativação inline (idempotente) — garante ativação mesmo sem worker rodando
    try {
      await activateContratoFull({
        supabase,
        contratoId: g.contratoId,
        pagarmeOrderId: g.orderId,
        pagarmePaymentStatus: g.paymentStatus ?? "paid",
        cupomFromGateway: g.cupomCodigo ?? null,
        userId: g.userId ?? null,
      });

      const BASE_URL = process.env.BASE_URL ?? "";
      const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? "";
      const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
      const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
      const PDF_SECRET = process.env.PDF_WORKER_SECRET ?? "";

      // PDF (fire-and-forget)
      if (BASE_URL && PDF_SECRET) {
        fetch(`${BASE_URL}/api/contrato/pdf`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-pdf-worker-secret": PDF_SECRET,
          },
          body: JSON.stringify({ contratoId: g.contratoId }),
        }).catch((e: unknown) =>
          console.error("[webhook] PDF generation failed:", e),
        );
      }

      // Lançamento financeiro (fire-and-forget, idempotente)
      supabase
        .from("contratos")
        .select("cliente_id, valor_mensal, valor_total")
        .eq("id", g.contratoId)
        .maybeSingle()
        .then(({ data: cd }) => {
          if (!cd || !g.orderId) return;
          const amountCents =
            typeof g.amountCents === "number" ? g.amountCents : null;
          let valor: number | null = null;
          if (amountCents != null) valor = amountCents / 100;
          else {
            const base = cd.valor_mensal ?? cd.valor_total ?? null;
            valor =
              typeof base === "number"
                ? base
                : typeof base === "string"
                  ? Number(base) || null
                  : null;
          }
          if (valor == null) return;
          supabase
            .from("financeiro_lancamentos")
            .select("id")
            .eq("ref_externo", g.orderId)
            .maybeSingle()
            .then(({ data: lex }) => {
              if (lex) return;
              supabase
                .from("financeiro_lancamentos")
                .insert({
                  cliente_id: cd.cliente_id,
                  contrato_id: g.contratoId,
                  tipo: "receita",
                  categoria: "assinatura",
                  valor,
                  moeda: "BRL",
                  descricao: "Pagamento inicial via gateway",
                  data_competencia: new Date().toISOString(),
                  data_pagamento: new Date().toISOString(),
                  origem: "pagarme",
                  ref_externo: g.orderId,
                  metadata: { gateway: "pagarme" },
                })
                .then(() => {});
            });
        })
        .catch((e: unknown) =>
          console.error("[webhook] financeiro insert failed:", e),
        );

      // NFS-e (fire-and-forget, idempotente)
      if (BASE_URL && INTERNAL_SECRET) {
        fetch(`${BASE_URL}/api/nfse/emitir`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-secret": INTERNAL_SECRET,
          },
          signal: AbortSignal.timeout(10000),
          body: JSON.stringify({ contrato_id: g.contratoId }),
        })
          .then((r) => {
            if (r.ok) {
              supabase
                .from("pagamento_processos")
                .update({ nfse_emitida: true })
                .eq("contrato_id", g.contratoId)
                .then(() => {});
            } else {
              r.text()
                .then((t) =>
                  console.error("[webhook] nfse emission failed:", t),
                )
                .catch(() => {});
            }
          })
          .catch((e: unknown) =>
            console.error("[webhook] nfse fetch failed:", e),
          );
      }

      // E-mail de confirmação (fire-and-forget)
      if (SUPABASE_URL && SERVICE_ROLE_KEY) {
        fetch(`${SUPABASE_URL}/functions/v1/email_notify`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tipo: "pagamento_confirmado",
            contrato_id: g.contratoId,
            dashboard_url: BASE_URL,
            express_url: `${BASE_URL}/dashboard/express`,
          }),
        })
          .then((r) => {
            if (r.ok) {
              supabase
                .from("pagamento_processos")
                .update({
                  pagamento_confirmado_enviado: true,
                  pagamento_status: "paid",
                })
                .eq("contrato_id", g.contratoId)
                .then(() => {});
            }
          })
          .catch((e: unknown) =>
            console.error("[webhook] email notify failed:", e),
          );
      }
    } catch (activationErr) {
      console.error(
        "[webhook] inline activation failed, job queued como fallback:",
        activationErr,
      );
    }

    // 2. Enfileira como backup idempotente (o job processor verifica se já está ativo)
    await supabase.from("webhook_jobs").insert({
      provider: "pagarme",
      event_id: g.eventId,
      event_hash: eventHash,
      order_id: g.orderId,
      contrato_id: g.contratoId,
      raw_event: evt,
      status: "pending",
      attempts: 0,
      scheduled_at: new Date().toISOString(),
    });

    await supabase
      .from("webhook_logs")
      .update({ processado: true })
      .eq("event_hash", eventHash);

    return NextResponse.json({ ok: true, enqueued: true });
  }
}
