// lib/contratos-flow.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as crypto from "node:crypto";
import { nowISO } from "./pagarme";

export function supabaseAdmin(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

type Contrato = {
  id: string;
  cliente_id: string;
  criado_por: string;
  status: string;
  cupom_codigo: string | null;
  numero_contrato: string | null;
  versao: string | null;
  criado_em: string | null;
};

export async function getContrato(
  supabase: SupabaseClient,
  contratoId: string,
) {
  const { data, error } = await supabase
    .from("contratos")
    .select(
      "id, cliente_id, criado_por, status, cupom_codigo, numero_contrato, versao, criado_em",
    )
    .eq("id", contratoId)
    .single();

  if (error || !data) return null;
  return data as Contrato;
}

/** Idempotência simples (recomendado: criar coluna/constraint unique para evt.id) */
export async function alreadyProcessedEvent(
  supabase: SupabaseClient,
  contratoId: string,
  eventId: string | null,
) {
  if (!eventId) return false;

  // Se você puder, crie uma coluna `gateway_event_id` em contrato_eventos e unique nela.
  // Aqui, fazemos um fallback: procurar em `dados->event_id` (depende do seu schema).
  const { data } = await supabase
    .from("contrato_eventos")
    .select("id")
    .eq("contrato_id", contratoId)
    .contains("dados", { event_id: eventId })
    .limit(1);

  return (data?.length ?? 0) > 0;
}

export async function markFailOrCancel(params: {
  supabase: SupabaseClient;
  contrato: Contrato;
  contratoId: string;
  pagarmeOrderId: string | null;
  pagarmePaymentStatus: string | null;
  paymentMethod: string | null;
  eventType: string;
  kind: "failed" | "canceled";
  eventId: string | null;
}) {
  const {
    supabase,
    contratoId,
    pagarmeOrderId,
    pagarmePaymentStatus,
    paymentMethod,
    eventType,
    kind,
    eventId,
    contrato,
  } = params;

  await supabase
    .from("contratos")
    .update({
      pagarme_order_id: pagarmeOrderId,
      pagarme_payment_status: pagarmePaymentStatus ?? kind,
      forma_pagamento: paymentMethod,
      atualizado_em: nowISO(),
    })
    .eq("id", contratoId);

  await supabase.from("contrato_eventos").insert({
    contrato_id: contratoId,
    tipo: kind === "failed" ? "pagamento_falhou" : "pagamento_cancelado",
    descricao: "Atualização via webhook Pagar.me",
    dados: {
      event_id: eventId,
      pagarme_order_id: pagarmeOrderId,
      pagarme_payment_status: pagarmePaymentStatus,
      forma_pagamento: paymentMethod,
      event_type: eventType,
    },
  });

  // libera cupom reservado
  if (contrato.cupom_codigo) {
    await supabase
      .from("cupom_reservas")
      .update({ status: "cancelado" })
      .eq("contrato_id", contratoId)
      .eq("status", "reservado");
  }
}

/** Marcação opcional de PIX pendente (sem polling) */
export async function markPixPending(params: {
  supabase: SupabaseClient;
  contratoId: string;
  pagarmeOrderId: string | null;
  pagarmePaymentStatus: string | null;
  eventType: string;
  eventId: string | null;
}) {
  const {
    supabase,
    contratoId,
    pagarmeOrderId,
    pagarmePaymentStatus,
    eventType,
    eventId,
  } = params;

  // ⚠️ Não mexo no status do contrato aqui (pra não quebrar enum),
  // mas registro status do gateway e um evento.
  await supabase
    .from("contratos")
    .update({
      pagarme_order_id: pagarmeOrderId,
      pagarme_payment_status: pagarmePaymentStatus ?? "pending",
      atualizado_em: nowISO(),
    })
    .eq("id", contratoId);

  await supabase.from("contrato_eventos").insert({
    contrato_id: contratoId,
    tipo: "pix_pendente",
    descricao: "PIX pendente (sem polling). Pode ser verificado manualmente.",
    dados: {
      event_id: eventId,
      pagarme_order_id: pagarmeOrderId,
      pagarme_payment_status: pagarmePaymentStatus ?? "pending",
      event_type: eventType,
    },
  });
}

/** Ativação completa (reaproveitável no webhook e na verificação manual PIX) */
export async function activateContrato(params: {
  supabase: SupabaseClient;
  contrato: Contrato;
  contratoId: string;
  pagarmeOrderId: string | null;
  pagarmePaymentStatus: string | null;
  paymentMethod: string | null;
  eventType: string;
  eventId: string | null;
  cupomFromGateway: string | null;
}) {
  const {
    supabase,
    contrato,
    contratoId,
    pagarmeOrderId,
    pagarmePaymentStatus,
    paymentMethod,
    eventType,
    eventId,
    cupomFromGateway,
  } = params;

  // idempotência: já ativo -> só consome reserva se ainda estiver reservada
  if (contrato.status === "ativo") {
    if (contrato.cupom_codigo) {
      await supabase
        .from("cupom_reservas")
        .update({ status: "consumido" })
        .eq("contrato_id", contratoId)
        .eq("status", "reservado");
    }
    return { alreadyActive: true };
  }

  // persistir cupom se veio do gateway e contrato não tem
  if (cupomFromGateway && !contrato.cupom_codigo) {
    await supabase
      .from("contratos")
      .update({ cupom_codigo: cupomFromGateway })
      .eq("id", contratoId);
  }

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

  // evento
  await supabase.from("contrato_eventos").insert({
    contrato_id: contratoId,
    tipo: "pagamento_confirmado",
    descricao: "Pagamento confirmado (webhook ou verificação manual PIX)",
    dados: {
      event_id: eventId,
      pagarme_order_id: pagarmeOrderId,
      pagarme_payment_status: pagarmePaymentStatus ?? "paid",
      forma_pagamento: paymentMethod,
      event_type: eventType,
    },
  });

  // consumir reserva do cupom (antifraude final)
  const cupomFinal =
    cupomFromGateway ??
    (contrato.cupom_codigo
      ? String(contrato.cupom_codigo).trim().toUpperCase()
      : null);

  if (cupomFinal) {
    await supabase
      .from("contratos")
      .update({ cupom_codigo: cupomFinal })
      .eq("id", contratoId);
    await supabase
      .from("cupom_reservas")
      .update({ status: "consumido" })
      .eq("contrato_id", contratoId)
      .eq("status", "reservado");
  }

  // cliente
  const { data: cliente } = await supabase
    .from("clientes")
    .select("id, nome, documento, ativo")
    .eq("id", contrato.cliente_id)
    .single();

  // usuário
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("id, nome_completo, email, documento")
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
      tipo_plano: "express",
      role: "cliente",
      data_inicio_plano: nowISO(),
      data_expiracao_plano: new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    })
    .eq("id", contrato.criado_por);

  // NFSe e PDF: mantém, mas sem quebrar webhook/manual se der erro.
  const baseUrl = process.env.BASE_URL;
  if (baseUrl) {
    fetch(`${baseUrl}/api/nfse/emitir`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contrato_id: contratoId }),
    }).catch(() => {});

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

    fetch(`${baseUrl}/api/contrato/gerar-pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contratoId,
        empresa,
        usuario: user,
        contrato: {
          numero: contrato.numero_contrato,
          versao: contrato.versao,
          dataAceite: contrato.criado_em,
          ip: "gateway",
          userAgent: "server",
        },
        hash,
      }),
    }).catch(() => {});
  }

  return { activated: true };
}
