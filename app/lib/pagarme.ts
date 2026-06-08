// app/lib/pagarme.ts
import * as crypto from "node:crypto";

export type PagarmeWebhook = {
  id?: string;
  type?: string;
  created_at?: string;
  data?: unknown; // ✅ importante: payload varia (charge/order)
};

export type ExtractedGatewayData = {
  eventId: string | null;
  eventType: string;
  contratoId: string | null;
  paymentMethod: string | null;
  paymentStatus: string | null;
  cupomCodigo: string | null;
  amountCents: number | null;
  orderId: string | null;
  chargeId: string | null;
  userId: string | null;
};

export type PagarmeCharge = {
  id?: string;
  status?: string;
  payment_method?: string;
  metadata?: Record<string, unknown>;
  order?: PagarmeOrder;
  amount?: number | null;
};

export type PagarmeOrder = {
  id?: string;
  status?: string;
  metadata?: Record<string, unknown>;
  charges?: PagarmeCharge[];
  amount?: number | null;
};

export type PagarmeOrderResponse = PagarmeOrder;

export function nowISO() {
  return new Date().toISOString();
}

/* ================= SIGNATURE ================= */

function getSignatureHeader(headers: Headers) {
  return (
    headers.get("x-hub-signature-256") ||
    headers.get("x-hub-signature") ||
    headers.get("x-pagarme-signature") ||
    headers.get("x-signature")
  );
}

export function verifySignature(params: {
  rawBody: Buffer;
  headers: Headers;
}): { ok: boolean; reason?: string } {
  const secret = process.env.PAGARME_WEBHOOK_SECRET;
  const isProd = process.env.NODE_ENV === "production";
  const sigHeader = getSignatureHeader(params.headers);

  if (!secret) return { ok: true };
  if (!sigHeader)
    return isProd ? { ok: false, reason: "Header ausente" } : { ok: true };

  let provided: string | undefined;
  let hmacAlgo: "sha256" | "sha1" = "sha256";

  if (sigHeader.includes("=")) {
    const [algoPart, sigPart] = sigHeader.split("=", 2);
    provided = sigPart;
    hmacAlgo = algoPart?.toLowerCase().includes("sha256") ? "sha256" : "sha1";
  } else {
    provided = sigHeader;
  }

  const expected = crypto
    .createHmac(hmacAlgo, secret)
    .update(params.rawBody)
    .digest("hex");

  if (!provided || provided.length !== expected.length) {
    return { ok: false, reason: "Assinatura inválida" };
  }

  const match = crypto.timingSafeEqual(
    Buffer.from(provided, "hex"),
    Buffer.from(expected, "hex"),
  );

  return match ? { ok: true } : { ok: false, reason: "Assinatura inválida" };
}

/* ================= HELPERS ================= */

function norm(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function upper(v: string | null): string | null {
  return v ? v.trim().toUpperCase() : null;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

/* ================= EXTRACTOR ================= */

export function extractGatewayData(evt: PagarmeWebhook): ExtractedGatewayData {
  const eventType = norm(evt.type)?.toLowerCase() ?? "";
  const eventId = norm(evt.id);

  console.log("🔥 [EXTRACT] raw evt:", JSON.stringify(evt, null, 2));

  const data = evt.data;

  if (!isRecord(data)) {
    console.warn("[EXTRACT] data inválido");
    return {
      eventId,
      eventType,
      contratoId: null,
      orderId: null,
      chargeId: null,
      paymentMethod: null,
      paymentStatus: null,
      cupomCodigo: null,
      amountCents: null,
      userId: null,
    };
  }

  const raw = data;

  const rawId = isRecord(raw) ? norm(raw["id"]) : null;
  const isChargeEvent = rawId?.startsWith("ch_") ?? false;

  // ✅ charges seguro
  const chargesArr =
    isRecord(raw) && Array.isArray(raw["charges"])
      ? (raw["charges"] as unknown[])
      : [];

  const firstCharge =
    chargesArr.length > 0 && isRecord(chargesArr[0])
      ? (chargesArr[0] as Record<string, unknown>)
      : null;

  // ✅ charge e order resolvidos corretamente
  const charge = isChargeEvent ? raw : firstCharge;

  const order =
    isChargeEvent && isRecord(raw["order"])
      ? (raw["order"] as Record<string, unknown>)
      : raw;

  // ✅ metadata seguro
  const metadata =
    (isRecord(charge) && isRecord(charge["metadata"])
      ? (charge["metadata"] as Record<string, unknown>)
      : null) ??
    (isRecord(order) && isRecord(order["metadata"])
      ? (order["metadata"] as Record<string, unknown>)
      : null);

  console.log("[EXTRACT] metadata:", metadata);

  // ✅ IDs seguros
  const orderId = isRecord(order) ? norm(order["id"]) : null;

  const chargeId = isRecord(charge) ? norm(charge["id"]) : null;

  console.log("[EXTRACT] orderId:", orderId);
  console.log("[EXTRACT] chargeId:", chargeId);

  // ✅ amount seguro
  const orderAmount =
    isRecord(order) && typeof order["amount"] === "number"
      ? order["amount"]
      : null;

  const chargeAmount =
    isRecord(charge) && typeof charge["amount"] === "number"
      ? charge["amount"]
      : null;

  const amountRaw = orderAmount ?? chargeAmount ?? null;

  const amountCents =
    typeof amountRaw === "number" && Number.isFinite(amountRaw)
      ? amountRaw
      : null;

  // ✅ dados
  const contratoId = norm(metadata?.contrato_id);
  const cupomCodigo = norm(metadata?.cupom_codigo);

  const paymentMethod = norm(charge?.payment_method ?? raw?.payment_method);

  const paymentStatus = norm(charge?.status ?? order?.status ?? raw?.status);

  console.log("[EXTRACT] contratoId:", contratoId);
  console.log("[EXTRACT] paymentStatus:", paymentStatus);
  console.log("[EXTRACT] amount:", amountCents);

  return {
    eventId,
    eventType,
    contratoId,
    orderId,
    chargeId,
    paymentMethod: paymentMethod?.toLowerCase() ?? null,
    paymentStatus: paymentStatus?.toLowerCase() ?? null,
    cupomCodigo: upper(cupomCodigo),
    amountCents,
    userId: norm(metadata?.user_id),
  };
}

/* ================= API ================= */

export function pagarmeAuthHeader(secretKey: string) {
  const basic = Buffer.from(`${secretKey}:`).toString("base64");
  return `Basic ${basic}`;
}

export async function fetchPagarmeOrder(
  orderId: string,
): Promise<PagarmeOrderResponse> {
  const secretKey = process.env.PAGARME_API_KEY;
  if (!secretKey) throw new Error("PAGARME_API_KEY ausente");

  const base = process.env.PAGARME_API_URL ?? "https://api.pagar.me/core/v5";

  const url = `${base}/orders/${encodeURIComponent(orderId)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: pagarmeAuthHeader(secretKey),
      Accept: "application/json",
    },
    signal: controller.signal,
  });

  clearTimeout(timeout);

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Falha ao consultar order (${res.status}): ${txt}`);
  }

  return (await res.json()) as PagarmeOrderResponse;
}
