// app/lib/contratos-flow.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { nowISO } from "./pagarme";

/**
 * Tipos mínimos para reduzir fricção de tipagem com PostgREST
 * sem cair em `any`.
 */
type PostgrestLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

function isPostgrestLikeError(e: unknown): e is PostgrestLikeError {
  return typeof e === "object" && e !== null && ("message" in e || "code" in e);
}

/**
 * ✅ helper: insere evento com gateway_event_id se existir no schema.
 * - se a coluna não existir, tenta novamente sem gateway_event_id.
 * - se for duplicado (23505), ignora (idempotência hard).
 */
async function insertContratoEvento(
  supabase: SupabaseClient,
  payload: {
    contrato_id: string;
    tipo: string;
    descricao?: string | null;
    dados?: unknown;
    gateway_event_id?: string | null;
  },
) {
  const baseRow: Record<string, unknown> = {
    contrato_id: payload.contrato_id,
    tipo: payload.tipo,
    descricao: payload.descricao ?? null,
    dados: payload.dados ?? null,
  };

  const withGateway: Record<string, unknown> = {
    ...baseRow,
    gateway_event_id: payload.gateway_event_id ?? null,
  };

  // 1) tenta com gateway_event_id
  const first = await supabase.from("contrato_eventos").insert(withGateway);

  if (!first.error) return;

  // duplicado (índice único): ignora
  const code = isPostgrestLikeError(first.error) ? first.error.code : undefined;
  if (code === "23505") return;

  // coluna não existe / schema antigo: tenta sem gateway_event_id
  const msg = isPostgrestLikeError(first.error)
    ? (first.error.message ?? "")
    : "";
  const looksLikeMissingColumn =
    msg.toLowerCase().includes("gateway_event_id") ||
    msg.toLowerCase().includes("column") ||
    msg.toLowerCase().includes("does not exist");

  if (looksLikeMissingColumn) {
    const second = await supabase.from("contrato_eventos").insert(baseRow);
    // duplicado no segundo também pode acontecer — ignora
    const code2 = isPostgrestLikeError(second.error)
      ? second.error?.code
      : undefined;
    if (code2 === "23505") return;

    if (second.error) {
      console.error(
        "[insertContratoEvento] fallback insert error:",
        second.error,
      );
    }
    return;
  }

  // qualquer outro erro real
  console.error("[insertContratoEvento] insert error:", first.error);
}

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
  versao: number | null;
  criado_em: string | null;
};

type ContratoRow = {
  id: string;
  cliente_id: string;
  criado_por: string;
  status: string;
  cupom_codigo: string | null;
  numero_contrato: string | null;
  versao: number | null;
  criado_em: string | null;
  pagarme_order_id?: string | null;

  // ✅ usados por validação de valor no webhook
  valor_mensal?: number | string | null;
  valor_total?: number | string | null;
};

export async function getContrato(
  supabase: SupabaseClient,
  contratoId: string,
) {
  const { data, error } = await supabase
    .from("contratos")
    .select(
      "id, cliente_id, criado_por, status, cupom_codigo, numero_contrato, versao, criado_em, pagarme_order_id, valor_mensal, valor_total",
    )
    .eq("id", contratoId)
    .single();

  if (error || !data) return null;
  return data as ContratoRow;
}

/**
 * ✅ Auditoria padrão para webhook e etapas internas
 */
export async function recordWebhookEvent(
  supabase: SupabaseClient,
  params: {
    contrato_id: string;
    tipo: string;
    gateway_event_id?: string | null;
    descricao?: string | null;
    dados?: unknown;
  },
) {
  await insertContratoEvento(supabase, {
    contrato_id: params.contrato_id,
    tipo: params.tipo,
    descricao: params.descricao ?? "Log automático",
    dados: params.dados ?? null,
    gateway_event_id: params.gateway_event_id ?? null,
  });
}

/**
 * ✅ Idempotência robusta:
 * 1) tenta achar por gateway_event_id (se existir coluna)
 * 2) fallback: buscar em dados.event_id (schema antigo)
 */
export async function alreadyProcessedEvent(
  supabase: SupabaseClient,
  contratoId: string,
  eventId: string | null,
) {
  if (!eventId) return false;

  // 1) tenta por coluna
  const byCol = await supabase
    .from("contrato_eventos")
    .select("id")
    // se a coluna não existir, esse select pode falhar — então tratamos erro
    .eq("gateway_event_id", eventId)
    .eq("contrato_id", contratoId)
    .limit(1);

  if (!byCol.error && (byCol.data?.length ?? 0) > 0) return true;

  // 2) fallback por JSON
  const { data: byJson } = await supabase
    .from("contrato_eventos")
    .select("id")
    .eq("contrato_id", contratoId)
    .contains("dados", { event_id: eventId })
    .limit(1);

  return (byJson?.length ?? 0) > 0;
}

export async function markFailOrCancel(params: {
  supabase: SupabaseClient;
  contrato: ContratoRow;
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
    contrato,
    contratoId,
    pagarmeOrderId,
    pagarmePaymentStatus,
    paymentMethod,
    eventType,
    kind,
    eventId,
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

  await insertContratoEvento(supabase, {
    contrato_id: contratoId,
    tipo: kind === "failed" ? "pagamento_falhou" : "pagamento_cancelado",
    descricao: "Atualização via webhook Pagar.me",
    gateway_event_id: eventId ?? null,
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

  await supabase
    .from("contratos")
    .update({
      pagarme_order_id: pagarmeOrderId,
      pagarme_payment_status: pagarmePaymentStatus ?? "pending",
      atualizado_em: nowISO(),
    })
    .eq("id", contratoId);

  await insertContratoEvento(supabase, {
    contrato_id: contratoId,
    tipo: "pix_pendente",
    descricao: "PIX pendente. Aguardando confirmação do gateway.",
    gateway_event_id: eventId ?? null,
    dados: {
      event_id: eventId,
      pagarme_order_id: pagarmeOrderId,
      pagarme_payment_status: pagarmePaymentStatus ?? "pending",
      event_type: eventType,
    },
  });
}

/**
 * ✅ ATIVAÇÃO COMPLETA (webhook/manual):
 * 1) ativa contrato
 * 2) ativa cliente
 * 3) ativa usuário
 * 4) consome cupom
 * 5) emite NFSe (best-effort)
 * 6) gera PDF (best-effort)
 */
export async function activateContratoFull(params: {
  supabase: SupabaseClient;
  contratoId: string;
  pagarmeOrderId: string | null;
  pagarmePaymentStatus: string;
  paymentMethod: string | null;
  eventType: string;
  eventId: string | null;
  cupomFromGateway: string | null;
}) {
  const {
    supabase,
    contratoId,
    pagarmeOrderId,
    pagarmePaymentStatus,
    paymentMethod,
    eventType,
    eventId,
    cupomFromGateway,
  } = params;

  const contrato = await getContrato(supabase, contratoId);
  if (!contrato) throw new Error("Contrato não encontrado para ativação");

  // idempotência: se já ativo, consome cupom se necessário e sai
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

  const cupomFinal =
    cupomFromGateway?.trim()?.toUpperCase?.() ??
    (contrato.cupom_codigo
      ? String(contrato.cupom_codigo).trim().toUpperCase()
      : null);

  // 1) ativa contrato
  await supabase
    .from("contratos")
    .update({
      status: "ativo",
      forma_pagamento: paymentMethod,
      pagarme_order_id: pagarmeOrderId,
      pagarme_payment_status: pagarmePaymentStatus ?? "paid",
      ...(cupomFinal ? { cupom_codigo: cupomFinal } : {}),
      atualizado_em: nowISO(),
    })
    .eq("id", contratoId);

  // 2) evento de pagamento confirmado
  await insertContratoEvento(supabase, {
    contrato_id: contratoId,
    tipo: "pagamento_confirmado",
    descricao: "Pagamento confirmado (webhook/manual)",
    gateway_event_id: eventId ?? null,
    dados: {
      event_id: eventId,
      pagarme_order_id: pagarmeOrderId,
      pagarme_payment_status: pagarmePaymentStatus,
      forma_pagamento: paymentMethod,
      event_type: eventType,
    },
  });

  // 3) consome cupom reservado
  if (cupomFinal) {
    await supabase
      .from("cupom_reservas")
      .update({ status: "consumido" })
      .eq("contrato_id", contratoId)
      .eq("status", "reservado");
  }

  // 4) ativa cliente
  await supabase
    .from("clientes")
    .update({ ativo: true })
    .eq("id", contrato.cliente_id);

  // 5) ativa usuário
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

  // 6) NFSe (best-effort)
  if (process.env.BASE_URL) {
    fetch(`${process.env.BASE_URL}/api/nfse/emitir`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contrato_id: contratoId }),
    }).catch((e) => console.error("NFSe emit error:", e));
  }

  // 7) PDF (best-effort)
  if (process.env.BASE_URL) {
    fetch(`${process.env.BASE_URL}/api/contrato/gerar-pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contratoId, origem: "webhook" }),
    }).catch((e) => console.error("PDF error:", e));
  }

  return { activated: true };
}

/**
 * Mantida para compatibilidade (verificação manual PIX).
 * Se você já migrou tudo para activateContratoFull, pode remover depois.
 */
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

  await insertContratoEvento(supabase, {
    contrato_id: contratoId,
    tipo: "pagamento_confirmado",
    descricao: "Pagamento confirmado (manual PIX)",
    gateway_event_id: eventId ?? null,
    dados: {
      event_id: eventId,
      pagarme_order_id: pagarmeOrderId,
      pagarme_payment_status: pagarmePaymentStatus ?? "paid",
      forma_pagamento: paymentMethod,
      event_type: eventType,
    },
  });

  return { activated: true };
}
