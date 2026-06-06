// app/lib/pagarme.ts
import * as crypto from "node:crypto";

export type PagarmeWebhook = {
  id?: string;
  type?: string;
  created_at?: string;
  data?: PagarmeOrder;
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

  if (!secret)
    return { ok: true };
  if (!sigHeader)
    return isProd ? { ok: false, reason: "Header ausente" } : { ok: true };

  let provided: string | undefined;
  let hmacAlgo: "sha256" | "sha1" = "sha1"; // default

  if (sigHeader.includes("=")) {
    const [algoPart, sigPart] = sigHeader.split("=", 2);

    provided = sigPart;
    hmacAlgo = algoPart?.toLowerCase().includes("sha256") ? "sha256" : "sha1";
  } else {
    provided = sigHeader;

    // ✅ normalmente assume sha256 (mais comum hoje)
    hmacAlgo = "sha256";
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

/**
 * Extrai dados do payload:
 *
 */
export function extractGatewayData(evt: PagarmeWebhook): ExtractedGatewayData {
  const eventType = norm(evt.type)?.toLowerCase() ?? "";
  const eventId = norm(evt.id);

  const data = evt.data ?? null;

  if (!isRecord(data)) {
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
    };
  }

  const order = data as PagarmeOrder;

  // ✅ charges
  const chargesArr = Array.isArray(order.charges) ? order.charges : [];
  const firstCharge = chargesArr.length > 0 ? chargesArr[0] : null;

  // ✅ metadata (prioridade correta)
  const metadata = firstCharge?.metadata ?? order?.metadata ?? null;

  // ✅ IDs
  const orderId = norm(order?.id) ?? null;
  const chargeId = norm(firstCharge?.id) ?? null;

  // ✅ valores
  const amountRaw =
    (typeof order.amount === "number" ? order.amount : null) ??
    (typeof firstCharge?.amount === "number" ? firstCharge.amount : null) ??
    null;

  const amountCents =
    typeof amountRaw === "number" && Number.isFinite(amountRaw)
      ? amountRaw
      : null;

  // ✅ metadata safe access
  const contratoId =
    metadata && typeof metadata === "object"
      ? norm((metadata as Record<string, unknown>)["contrato_id"])
      : null;

  const cupomCodigo =
    metadata && typeof metadata === "object"
      ? norm((metadata as Record<string, unknown>)["cupom_codigo"])
      : null;

  const paymentMethod = norm(firstCharge?.payment_method) ?? null;

  const paymentStatus =
    norm(firstCharge?.status) ?? norm(order?.status) ?? null;

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
  };
}

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
  console.log(
    `Consultando Pagar.me order ${orderId} via ${url} com API key ${secretKey ? "****" : "(ausente)"}`,
  );

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
