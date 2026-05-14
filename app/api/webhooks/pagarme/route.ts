import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as crypto from "node:crypto";

type PagarmeWebhook = {
  id?: string;
  type?: string;
  created_at?: string;
  data?: unknown;
};

type PagarmeOrder = {
  metadata?: {
    contrato_id?: string;
  };
};

function nowISO() {
  return new Date().toISOString();
}

/** Verificação de assinatura */
function verifySignature(
  rawBody: string,
  headers: Headers,
): { ok: boolean; reason?: string } {
  const secret = process.env.PAGARME_WEBHOOK_SECRET;
  const isProd = process.env.NODE_ENV === "production";

  const sigHeader =
    headers.get("x-hub-signature-256") ||
    headers.get("x-hub-signature") ||
    headers.get("x-pagarme-signature") ||
    headers.get("x-signature");

  if (!secret) {
    if (isProd) return { ok: false, reason: "Secret ausente em produção" };
    return { ok: true };
  }

  if (!sigHeader) {
    if (isProd) return { ok: false, reason: "Header ausente" };
    return { ok: true };
  }

  const [algo, provided] = sigHeader.split("=", 2);

  const hmacAlgo: "sha256" | "sha1" = algo?.toLowerCase().includes("sha256")
    ? "sha256"
    : "sha1";

  const expected = crypto
    .createHmac(hmacAlgo, secret)
    .update(rawBody, "utf8")
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

export async function POST(req: Request) {
  const rawBody = await req.text();

  const sig = verifySignature(rawBody, req.headers);
  if (!sig.ok) {
    return NextResponse.json(
      { error: "Assinatura inválida", reason: sig.reason },
      { status: 401 },
    );
  }

  let evt: PagarmeWebhook;

  try {
    evt = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const eventType = String(evt.type ?? "")
    .toLowerCase()
    .trim();

  const isPaidEvent = eventType === "order.paid" || eventType === "charge.paid";

  const isFailEvent =
    eventType === "order.payment_failed" ||
    eventType === "charge.payment_failed";

  const isCancelEvent =
    eventType === "order.canceled" || eventType === "checkout.canceled";

  if (!isPaidEvent && !isFailEvent && !isCancelEvent) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // ✅ EXTRAIR ORDER

  const rawObject = (evt as { data?: { object?: unknown } })?.data?.object as {
    id?: string;
    status?: string;
    order?: PagarmeOrder;
    metadata?: { contrato_id?: string };
    payment_method?: string;
    charges?: Array<{
      payment_method?: string;
      status?: string;
    }>;
  };
  const pagarmeOrderId = rawObject?.id ?? null;
  const paymentMethod =
    rawObject?.charges?.[0]?.payment_method ??
    rawObject?.payment_method ??
    null;

  const pagarmePaymentStatus =
    rawObject?.charges?.[0]?.status ?? rawObject?.status ?? null;

  const order: PagarmeOrder | null =
    (rawObject as { order?: PagarmeOrder })?.order ||
    (rawObject as PagarmeOrder) ||
    null;

  const contratoId =
    order?.metadata?.contrato_id ?? rawObject?.metadata?.contrato_id;

  if (!isPaidEvent) {
    return NextResponse.json({ ok: true });
  }

  if (!contratoId) {
    console.error("contratoId não encontrado");
    return NextResponse.json({ ok: true });
  }

  // ✅ CONTRATO
  const { data: contrato, error } = await supabase
    .from("contratos")
    .select("*")
    .eq("id", contratoId)
    .single();

  if (error || !contrato) {
    console.error("Contrato não encontrado");
    return NextResponse.json({ ok: true });
  }

  if (contrato.status === "ativo") {
    return NextResponse.json({ ok: true, already_active: true });
  }

  // ✅ ATIVAR CONTRATO
  await supabase
    .from("contratos")
    .update({
      status: "ativo",
      forma_pagamento: paymentMethod,
      pagarme_order_id: pagarmeOrderId,
      pagarme_payment_status: pagarmePaymentStatus ?? "paid",
      atualizado_em: nowISO(),
    })
    .eq("id", contratoId);

  await supabase.from("contrato_eventos").insert({
    contrato_id: contratoId,
    tipo: "pagamento_confirmado",
    descricao: "Pagamento confirmado via webhook Pagar.me",
    dados: {
      pagarme_order_id: pagarmeOrderId,
      pagarme_payment_status: pagarmePaymentStatus ?? "paid",
      forma_pagamento: paymentMethod,
      event_type: eventType,
    },
  });

  // ✅ CLIENTE
  const { data: cliente } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", contrato.cliente_id)
    .single();

  // ✅ USUÁRIO
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", contrato.criado_por)
    .single();

  await supabase
    .from("clientes")
    .update({ ativo: true })
    .eq("id", contrato.cliente_id);

  await supabase
    .from("usuarios")
    .update({
      ativo: true,
      plano: "express",
      data_inicio_plano: nowISO(),
      data_expiracao_plano: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()

    })
    .eq("id", contrato.criado_por);

  // ✅ DADOS PDF
  const empresa = {
    razaoSocial: cliente?.nome ?? "",
    cnpj: cliente?.documento ?? "",
  };

  const user = {
    nome: usuario?.nome_completo ?? "",
    email: usuario?.email ?? "",
    documento: usuario?.documento ?? "",
  };

  const hash = crypto.randomUUID();

  try {
    await fetch(`${process.env.BASE_URL}/api/contrato/gerar-pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contratoId,
        empresa,
        usuario: user,
        contrato: {
          numero: contrato.numero_contrato,
          versao: contrato.versao,
          dataAceite: contrato.criado_em,
          ip: "webhook",
          userAgent: "server",
        },
        hash,
      }),
    });
  } catch (err) {
    console.error("Erro PDF:", err);
  }
  if (isFailEvent || isCancelEvent) {
    await supabase
      .from("contratos")
      .update({
        pagarme_order_id: pagarmeOrderId,
        pagarme_payment_status:
          pagarmePaymentStatus ?? (isFailEvent ? "failed" : "canceled"),
        forma_pagamento: paymentMethod,
        atualizado_em: nowISO(),
      })
      .eq("id", contratoId);

    await supabase.from("contrato_eventos").insert({
      contrato_id: contratoId,
      tipo: isFailEvent ? "pagamento_falhou" : "pagamento_cancelado",
      descricao: "Atualização via webhook Pagar.me",
      dados: {
        pagarme_order_id: pagarmeOrderId,
        pagarme_payment_status: pagarmePaymentStatus,
        forma_pagamento: paymentMethod,
        event_type: eventType,
      },
    });

    return NextResponse.json({ ok: true, updated: true });
  }
  return NextResponse.json({
    ok: true,
    activated: true,
    contrato_id: contratoId,
  });
}
