import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { nowISO } from "./pagarme";

type PostgrestLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};
type PaymentHandlerParams = {
  supabase: SupabaseClient;
  contratoId: string;
  pagarmeOrderId: string | null;
  pagarmePaymentStatus: string | null;
  paymentMethod: string | null;
  eventType: string;
  eventId: string | null;
};
type FailOrCancelParams = PaymentHandlerParams & {
  kind: "failed" | "canceled";
};

type ActivateParams = PaymentHandlerParams & {
  cupomFromGateway?: string | null;
};


function isPostgrestLikeError(e: unknown): e is PostgrestLikeError {
  return typeof e === "object" && e !== null && ("message" in e || "code" in e);
}

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

  const first = await supabase.from("contrato_eventos").insert(withGateway);

  if (!first.error) return;

  const code = isPostgrestLikeError(first.error) ? first.error.code : undefined;
  if (code === "23505") return;

  const msg = isPostgrestLikeError(first.error)
    ? (first.error.message ?? "")
    : "";

  const looksLikeMissingColumn =
    msg.toLowerCase().includes("gateway_event_id") ||
    msg.toLowerCase().includes("column") ||
    msg.toLowerCase().includes("does not exist");

  if (looksLikeMissingColumn) {
    const second = await supabase.from("contrato_eventos").insert(baseRow);
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

  console.error("[insertContratoEvento] insert error:", first.error);
}

export function supabaseAdmin(): SupabaseClient {
  return createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

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
  valor_mensal?: number | string | null;
  valor_total?: number | string | null;
};

export async function getContrato(
  supabase: SupabaseClient,
  contratoId: string,
) {
  const { data, error } = await supabase
    .from("contratos")
    .select("*")
    .eq("id", contratoId)
    .maybeSingle();

  if (error || !data) return null;
  return data as ContratoRow;
}

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

export async function alreadyProcessedEvent(
  supabase: SupabaseClient,
  contratoId: string,
  eventId: string | null,
) {
  if (!eventId) return false;

  const byCol = await supabase
    .from("contrato_eventos")
    .select("id")
    .eq("gateway_event_id", eventId)
    .eq("contrato_id", contratoId)
    .limit(1);

  if (!byCol.error && (byCol.data?.length ?? 0) > 0) return true;

  const { data: byJson } = await supabase
    .from("contrato_eventos")
    .select("id")
    .eq("contrato_id", contratoId)
    .contains("dados", { event_id: eventId })
    .limit(1);

  return (byJson?.length ?? 0) > 0;
}

export async function applyContratoUpgrade(params: {
  supabase: SupabaseClient;
  contratoId: string;
  orderId: string | null;
  paymentStatus: string;
}) {
  const { supabase, contratoId, orderId, paymentStatus } = params;

  if (!orderId) {
    throw new Error("orderId ausente para upgrade.");
  }

  const { data: upgrade, error: upgradeErr } = await supabase
    .from("contratos_upgrades")
    .select("*")
    .eq("pagarme_order_id", orderId)
    .maybeSingle();

  if (upgradeErr || !upgrade) {
    throw new Error("Upgrade não encontrado.");
  }

  if (String(upgrade.pagarme_payment_status).toLowerCase() === "paid") {
    return { updated: true, alreadyPaid: true };
  }

  const quantidade = Number(upgrade.quantidade_adicional ?? 0);

  if (!Number.isFinite(quantidade) || quantidade <= 0) {
    throw new Error("Quantidade inválida no upgrade.");
  }

  const { data: contrato } = await supabase
    .from("contratos")
    .select("limite_usuarios")
    .eq("id", contratoId)
    .maybeSingle();

  const limiteAnterior = Number(contrato?.limite_usuarios ?? 0);
  const limiteNovo = limiteAnterior + quantidade;

  await supabase
    .from("contratos")
    .update({
      limite_usuarios: limiteNovo,
      atualizado_em: nowISO(),
    })
    .eq("id", contratoId);

  await supabase
    .from("contratos_upgrades")
    .update({
      limite_anterior: limiteAnterior,
      limite_novo: limiteNovo,
      pagarme_payment_status: "paid",
      paid_at: nowISO(),
    })
    .eq("id", upgrade.id);

  await insertContratoEvento(supabase, {
    contrato_id: contratoId,
    tipo: "upgrade_confirmado",
    descricao: "Upgrade confirmado",
    dados: {
      orderId,
      quantidade,
      limiteAnterior,
      limiteNovo,
      paymentStatus,
    },
  });

  return { updated: true };
}

export async function markFailOrCancel(params: FailOrCancelParams) {
  const { supabase, contratoId, pagarmePaymentStatus, kind } = params;

  await supabase
    .from("contratos")
    .update({
      pagarme_payment_status: pagarmePaymentStatus ?? kind,
      atualizado_em: nowISO(),
    })
    .eq("id", contratoId);
}


export async function markPixPending(params: PaymentHandlerParams) {
  console.log("PIX pendente", params);
}

export async function activateContratoFull(params: ActivateParams) {
  const { supabase, contratoId, pagarmeOrderId, pagarmePaymentStatus } = params;

  await supabase
    .from("contratos")
    .update({
      status: "ativo",
      pagarme_order_id: pagarmeOrderId,
      pagarme_payment_status: pagarmePaymentStatus ?? "paid",
      atualizado_em: nowISO(),
    })
    .eq("id", contratoId);

  return {
    activated: true,
    alreadyActive: false,
  };
}

