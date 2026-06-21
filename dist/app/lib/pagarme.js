"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.nowISO = nowISO;
exports.verifySignature = verifySignature;
exports.extractGatewayData = extractGatewayData;
exports.pagarmeAuthHeader = pagarmeAuthHeader;
exports.fetchPagarmeOrder = fetchPagarmeOrder;
// app/lib/pagarme.ts
const crypto = __importStar(require("node:crypto"));
function nowISO() {
    return new Date().toISOString();
}
/* ================= SIGNATURE ================= */
function getSignatureHeader(headers) {
    return (headers.get("x-hub-signature-256") ||
        headers.get("x-hub-signature") ||
        headers.get("x-pagarme-signature") ||
        headers.get("x-signature"));
}
function verifySignature(params) {
    const secret = process.env.PAGARME_WEBHOOK_SECRET;
    const isProd = process.env.NODE_ENV === "production";
    const sigHeader = getSignatureHeader(params.headers);
    if (!secret)
        return { ok: false, reason: "PAGARME_WEBHOOK_SECRET not configured" };
    if (!sigHeader)
        return isProd ? { ok: false, reason: "Header ausente" } : { ok: true };
    let provided;
    let hmacAlgo = "sha256";
    if (sigHeader.includes("=")) {
        const [algoPart, sigPart] = sigHeader.split("=", 2);
        provided = sigPart;
        hmacAlgo = algoPart?.toLowerCase().includes("sha256") ? "sha256" : "sha1";
    }
    else {
        provided = sigHeader;
    }
    const expected = crypto
        .createHmac(hmacAlgo, secret)
        .update(params.rawBody)
        .digest("hex");
    if (!provided || provided.length !== expected.length) {
        return { ok: false, reason: "Assinatura inválida" };
    }
    const match = crypto.timingSafeEqual(Buffer.from(provided, "hex"), Buffer.from(expected, "hex"));
    return match ? { ok: true } : { ok: false, reason: "Assinatura inválida" };
}
/* ================= HELPERS ================= */
function norm(v) {
    if (v === null || v === undefined)
        return null;
    const s = String(v).trim();
    return s ? s : null;
}
function upper(v) {
    return v ? v.trim().toUpperCase() : null;
}
function isRecord(x) {
    return typeof x === "object" && x !== null;
}
/* ================= EXTRACTOR ================= */
function extractGatewayData(evt) {
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
    const chargesArr = isRecord(raw) && Array.isArray(raw["charges"])
        ? raw["charges"]
        : [];
    const firstCharge = chargesArr.length > 0 && isRecord(chargesArr[0])
        ? chargesArr[0]
        : null;
    // ✅ charge e order resolvidos corretamente
    const charge = isChargeEvent ? raw : firstCharge;
    const order = isChargeEvent && isRecord(raw["order"])
        ? raw["order"]
        : raw;
    // ✅ metadata seguro
    const metadata = (isRecord(charge) && isRecord(charge["metadata"])
        ? charge["metadata"]
        : null) ??
        (isRecord(order) && isRecord(order["metadata"])
            ? order["metadata"]
            : null);
    console.log("[EXTRACT] metadata:", metadata);
    // ✅ IDs seguros
    const orderId = isRecord(order) ? norm(order["id"]) : null;
    const chargeId = isRecord(charge) ? norm(charge["id"]) : null;
    console.log("[EXTRACT] orderId:", orderId);
    console.log("[EXTRACT] chargeId:", chargeId);
    // ✅ amount seguro
    const orderAmount = isRecord(order) && typeof order["amount"] === "number"
        ? order["amount"]
        : null;
    const chargeAmount = isRecord(charge) && typeof charge["amount"] === "number"
        ? charge["amount"]
        : null;
    const amountRaw = orderAmount ?? chargeAmount ?? null;
    const amountCents = typeof amountRaw === "number" && Number.isFinite(amountRaw)
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
function pagarmeAuthHeader(secretKey) {
    const basic = Buffer.from(`${secretKey}:`).toString("base64");
    return `Basic ${basic}`;
}
async function fetchPagarmeOrder(orderId) {
    const secretKey = process.env.PAGARME_API_KEY;
    if (!secretKey)
        throw new Error("PAGARME_API_KEY ausente");
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
    return (await res.json());
}
