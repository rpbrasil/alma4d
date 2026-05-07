import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type JsonObject = Record<string, unknown>;

type PagarmeWebhook = {
  id?: string;
  type?: string; // "order.paid" etc
  created_at?: string;
  data?: unknown;
};

function nowISO() {
  return new Date().toISOString();
}

function isObject(v: unknown): v is JsonObject {
  return typeof v === "object" && v !== null;
}

function getString(obj: JsonObject, key: string): string | null {
  const v = obj[key];
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number") return String(v);
  return null;
}

function getBoolean(obj: JsonObject, key: string): boolean | null {
  const v = obj[key];
  if (typeof v === "boolean") return v;
  return null;
}

function centsToBRL(cents: unknown): number | null {
  const n = typeof cents === "number" ? cents : Number(cents);
  if (!Number.isFinite(n)) return null;
  return Math.round(n) / 100;
}

function extractUserIdFromOrderCode(orderCode: string): string | null {
  const m = orderCode.match(/u:([0-9a-fA-F-]{36})\|s:\d+/);
  return m?.[1] ?? null;
}

/**
 * Extração mais robusta de order_code:
 * - evt.data.order_code / code
 * - evt.data.metadata.order_code
 * - evt.data.charges[0].metadata.order_code
 * - evt.data.charges[0].last_transaction.metadata.order_code
 */
function extractOrderCode(evt: PagarmeWebhook): string | null {
  if (!isObject(evt.data)) return null;
  const d = evt.data;

  const direct =
    getString(d, "order_code") ??
    getString(d, "code") ??
    getString(d, "orderCode");

  if (direct) return direct;

  const metaRaw = (d as JsonObject)["metadata"];
  if (isObject(metaRaw)) {
    const m =
      getString(metaRaw, "order_code") ??
      getString(metaRaw, "orderCode") ??
      getString(metaRaw, "code");
    if (m) return m;
  }

  const chargesRaw = (d as JsonObject)["charges"];
  const charges = Array.isArray(chargesRaw) ? chargesRaw : [];
  const firstCharge = isObject(charges[0]) ? (charges[0] as JsonObject) : null;

  if (firstCharge) {
    const cMeta = firstCharge["metadata"];
    if (isObject(cMeta)) {
      const m =
        getString(cMeta, "order_code") ??
        getString(cMeta, "orderCode") ??
        getString(cMeta, "code");
      if (m) return m;
    }

    const lastTxRaw = firstCharge["last_transaction"];
    if (isObject(lastTxRaw)) {
      const txMeta = lastTxRaw["metadata"];
      if (isObject(txMeta)) {
        const m =
          getString(txMeta, "order_code") ??
          getString(txMeta, "orderCode") ??
          getString(txMeta, "code");
        if (m) return m;
      }
    }
  }

  return null;
}

function extractChargeInfo(evt: PagarmeWebhook): {
  charge_id: string | null;
  transaction_id: string | null;
  payment_method: string | null;
  paid_at: string | null;
} {
  if (!isObject(evt.data)) {
    return { charge_id: null, transaction_id: null, payment_method: null, paid_at: null };
  }

  const order = evt.data as JsonObject;
  const chargesRaw = order["charges"];
  const charges = Array.isArray(chargesRaw) ? chargesRaw : [];
  const firstCharge = isObject(charges[0]) ? (charges[0] as JsonObject) : null;

  const charge_id = firstCharge ? getString(firstCharge, "id") : null;
  const payment_method = firstCharge ? getString(firstCharge, "payment_method") : null;
  const paid_at = firstCharge ? getString(firstCharge, "paid_at") : null;

  let transaction_id: string | null = null;
  if (firstCharge) {
    const lastTxRaw = firstCharge["last_transaction"];
    if (isObject(lastTxRaw)) {
      transaction_id = getString(lastTxRaw, "id");
    }
  }

  return { charge_id, transaction_id, payment_method, paid_at };
}

/**
 * Verificação de assinatura HMAC:
 * - DEV: permissiva (se secret/header faltar, aceita)
 * - PROD: exige secret e header (401 se faltar / inválida)
 */
function verifySignature(rawBody: string, headers: Headers): { ok: boolean; reason?: string } {
  const secret = process.env.PAGARME_WEBHOOK_SECRET;
  const isProd = process.env.NODE_ENV === "production";

  const sigHeader =
    headers.get("x-hub-signature-256") ||
    headers.get("x-hub-signature") ||
    headers.get("x-pagarme-signature") ||
    headers.get("x-signature");

  if (!secret) {
    if (isProd) return { ok: false, reason: "PAGARME_WEBHOOK_SECRET ausente em produção" };
    return { ok: true };
  }

  if (!sigHeader) {
    if (isProd) return { ok: false, reason: "Header de assinatura ausente" };
    return { ok: true };
  }

  const [algo, provided] = sigHeader.split("=", 2);
  if (!algo || !provided) return { ok: false, reason: "Formato de assinatura inválido" };

  const algoNorm = algo.toLowerCase();
  const hmacAlgo: "sha256" | "sha1" = algoNorm.includes("sha256") ? "sha256" : "sha1";

  const expected = crypto
    .createHmac(hmacAlgo, secret)
    .update(rawBody, "utf8")
    .digest("hex");

  if (provided.length !== expected.length) return { ok: false, reason: "Assinatura com tamanho inválido" };

  try {
    const match = crypto.timingSafeEqual(
      Buffer.from(provided, "hex"),
      Buffer.from(expected, "hex"),
    );
    return match ? { ok: true } : { ok: false, reason: "Assinatura não confere" };
  } catch {
    return { ok: false, reason: "Falha ao comparar assinatura" };
  }
}

/** Pega metadata (prioridade: charge -> order -> last_transaction). */
function extractMetadata(evt: PagarmeWebhook): JsonObject | null {
  if (!isObject(evt.data)) return null;
  const order = evt.data as JsonObject;

  const orderMeta = order["metadata"];
  if (isObject(orderMeta)) return orderMeta as JsonObject;

  // fallback: charge metadata
  const chargesRaw = order["charges"];
  const charges = Array.isArray(chargesRaw) ? chargesRaw : [];
  const firstCharge = isObject(charges[0]) ? (charges[0] as JsonObject) : null;
  if (firstCharge) {
    const chargeMeta = firstCharge["metadata"];
    if (isObject(chargeMeta)) return chargeMeta as JsonObject;

    const lastTx = firstCharge["last_transaction"];
    if (isObject(lastTx)) {
      const txMeta = lastTx["metadata"];
      if (isObject(txMeta)) return txMeta as JsonObject;
    }
  }

  return null;
}

export async function POST(req: Request) {
  const rawBody = await req.text();

  const sig = verifySignature(rawBody, req.headers);
  if (!sig.ok) {
    return NextResponse.json({ error: "Assinatura inválida", reason: sig.reason }, { status: 401 });
  }

  let evt: PagarmeWebhook;
  try {
    evt = JSON.parse(rawBody) as PagarmeWebhook;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const eventType = String(evt?.type ?? "").trim().toLowerCase();

  const isPaidEvent = eventType === "order.paid" || eventType === "charge.paid";
  const isFailEvent = eventType === "order.payment_failed" || eventType === "charge.payment_failed";
  const isCancelEvent = eventType === "order.canceled" || eventType === "checkout.canceled";

  if (!isPaidEvent && !isFailEvent && !isCancelEvent) {
    return NextResponse.json({ ok: true, ignored: true, type: eventType }, { status: 200 });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Supabase env ausente" }, { status: 500 });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );

  const orderCode = extractOrderCode(evt);
  const { charge_id, transaction_id, payment_method, paid_at } = extractChargeInfo(evt);

  // ======================================================================
  // 1) Atualiza payment_links (se houver) — útil p/ Premium, mas não obrigatório
  // ======================================================================
  let paymentRow: JsonObject | null = null;

  if (orderCode) {
    const { data, error } = await supabase
      .from("payment_links")
      .select("*")
      .eq("order_id", orderCode)
      .maybeSingle();

    if (!error && isObject(data)) paymentRow = data;
  }

  // Idempotência de payment_links
  if (isPaidEvent && paymentRow && getString(paymentRow, "status") === "paid") {
    // segue adiante para ativação NR‑1 mesmo assim (caso payment_links exista)
    // mas evita retrabalho nele
  } else if (paymentRow) {
    const newStatus = isPaidEvent ? "paid" : isFailEvent ? "failed" : "canceled";

    const patch: Record<string, unknown> = {
      status: newStatus,
      last_event: eventType,
      updated_at: nowISO(),
      payment_method: payment_method ?? paymentRow["payment_method"] ?? null,
      charge_id: charge_id ?? paymentRow["charge_id"] ?? null,
      transaction_id: transaction_id ?? paymentRow["transaction_id"] ?? null,
    };

    if (isPaidEvent) {
      patch.paid_at = paid_at ? new Date(paid_at).toISOString() : nowISO();
    }

    const paymentId = getString(paymentRow, "id");
    if (paymentId) {
      await supabase.from("payment_links").update(patch).eq("id", paymentId);
    }
  }

  // ======================================================================
  // 2) Se não for pago, encerra aqui (somos “event-driven” para ativação)
  // ======================================================================
  if (!isPaidEvent) {
    return NextResponse.json({ ok: true, status: "updated", type: eventType }, { status: 200 });
  }

  // ======================================================================
  // 3) Resolver cliente/contrato com prioridade máxima para metadata
  // ======================================================================
  const meta = extractMetadata(evt);

  let resolvedClienteId: string | null = meta ? getString(meta, "cliente_id") : null;
  let resolvedContratoId: string | null = meta ? getString(meta, "contrato_id") : null;

  const cupom_codigo = meta ? getString(meta, "cupom_codigo") : null;
  const discount_amount = meta ? (meta["discount_amount"] ?? meta["discountAmount"]) : null;
  const commission_amount = meta ? (meta["commission_amount"] ?? meta["commissionAmount"]) : null;

  // Valor do pedido (para salvar valor_total no contrato, se quiser)
  const orderAmountCents = isObject(evt.data) ? (evt.data as JsonObject)["amount"] : null;
  const orderAmountBRL = centsToBRL(orderAmountCents);

  // fallback: derivar user_id pelo orderCode (se metadata falhar)
  const userIdFromOrder = orderCode ? extractUserIdFromOrderCode(orderCode) : null;

  // fallback: buscar cliente pelo usuário
  if (!resolvedClienteId && userIdFromOrder) {
    const { data: u } = await supabase
      .from("usuarios")
      .select("cliente_id")
      .eq("id", userIdFromOrder)
      .maybeSingle();

    if (isObject(u)) resolvedClienteId = getString(u, "cliente_id");
  }

  // fallback: buscar contrato NR‑1 mais recente em rascunho
  if (!resolvedContratoId && resolvedClienteId) {
    const { data: c } = await supabase
      .from("contratos")
      .select("id,status")
      .eq("cliente_id", resolvedClienteId)
      .eq("tipo_contrato", "nr1_psicossocial")
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (isObject(c)) resolvedContratoId = getString(c, "id");
  }

  if (!resolvedClienteId || !resolvedContratoId) {
    return NextResponse.json(
      { ok: true, warning: "paid received but could not resolve cliente/contrato", orderCode },
      { status: 200 },
    );
  }

  // ======================================================================
  // 4) Idempotência de ativação: se contrato já está ativo, não repete
  // ======================================================================
  const { data: contratoRow } = await supabase
    .from("contratos")
    .select("id,status")
    .eq("id", resolvedContratoId)
    .maybeSingle();

  const contratoStatus = isObject(contratoRow) ? getString(contratoRow, "status") : null;
  const alreadyActive = contratoStatus?.toLowerCase() === "ativo";

  if (!alreadyActive) {
    // 4) ativar contrato
    await supabase
      .from("contratos")
      .update({
        status: "ativo",
        atualizado_em: nowISO(),
        ...(cupom_codigo ? { cupom_codigo } : {}),
        forma_pagamento: payment_method ?? "pagarme",
        ...(orderAmountBRL !== null ? { valor_total: orderAmountBRL } : {}),
      })
      .eq("id", resolvedContratoId);

    // 5) ativar cliente
    // (mantive updated_at porque seu código anterior já usa; se não existir, remova)
    await supabase
      .from("clientes")
      .update({ ativo: true, updated_at: nowISO() })
      .eq("id", resolvedClienteId);

    // 6) ativar usuários do cliente
    await supabase
      .from("usuarios")
      .update({ ativo: true, updated_at: nowISO() })
      .eq("cliente_id", resolvedClienteId);
  }

  // 7) registrar cupons_uso (idempotente por contrato)
  if (cupom_codigo) {
    const { data: cup } = await supabase
      .from("cupons")
      .select("id,ativo,codigo")
      .ilike("codigo", cupom_codigo)
      .maybeSingle();

    const cupId = isObject(cup) ? getString(cup, "id") : null;
    const cupAtivo = isObject(cup) ? (getBoolean(cup, "ativo") ?? false) : false;

    if (cupId && cupAtivo) {
      const { data: existingUse } = await supabase
        .from("cupons_uso")
        .select("id")
        .eq("contrato_id", resolvedContratoId)
        .limit(1)
        .maybeSingle();

      const already = isObject(existingUse) ? Boolean(getString(existingUse, "id")) : false;

      if (!already) {
        const vDesc = centsToBRL(discount_amount);
        const vCom = centsToBRL(commission_amount);

        await supabase.from("cupons_uso").insert({
          cupom_id: cupId,
          cliente_id: resolvedClienteId,
          contrato_id: resolvedContratoId,
          valor_desconto: vDesc,
          valor_comissao: vCom,
          created_at: nowISO(),
        });
      }
    }
  }

  return NextResponse.json(
    {
      ok: true,
      activated: true,
      already_active: alreadyActive,
      cliente_id: resolvedClienteId,
      contrato_id: resolvedContratoId,
      order_code: orderCode,
      event: eventType,
      charge_id,
      transaction_id,
    },
    { status: 200 },
  );
}

import crypto from "crypto";
