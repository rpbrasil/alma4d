import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { nowISO } from "./pagarme";

type ContratoRow = {
  id: string;
  cliente_id: string;
  criado_por: string;
  status: string;

  cupom_codigo?: string | null;

  desconto_cents?: number | null;
  total_com_desconto_cents?: number | null;
  cupom_percentual?: number | null;

  numero_contrato: string | null;
  versao: number | null;
  criado_em: string | null;

  pagarme_order_id?: string | null;
  valor_mensal?: number | string | null;
  valor_total?: number | string | null;
};

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
type ActivateParams = {
  supabase: SupabaseClient;
  contratoId: string;
  pagarmeOrderId: string | null;
  pagarmePaymentStatus: string | null;
  cupomFromGateway?: string | null;
  userId?: string | null;
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
  const { supabase, contratoId, orderId } = params;

  if (!orderId) {
    throw new Error("orderId ausente para upgrade.");
  }

  // 🔒 1. Busca upgrade
  const { data: upgrade, error: upgradeErr } = await supabase
    .from("contratos_upgrades")
    .select(
      "id, contrato_id, quantidade_adicional, limite_anterior, limite_novo, pagarme_payment_status, paid_at",
    )
    .eq("pagarme_order_id", orderId)
    .maybeSingle();

  if (upgradeErr || !upgrade) {
    throw new Error("Upgrade não encontrado.");
  }

  // ✅ 2. Idempotência (CRÍTICO)
  if (
    upgrade.paid_at ||
    String(upgrade.pagarme_payment_status).toLowerCase() === "paid"
  ) {
    return { updated: true, alreadyPaid: true };
  }

  const quantidade = Number(upgrade.quantidade_adicional ?? 0);

  if (!Number.isFinite(quantidade) || quantidade <= 0) {
    throw new Error("Quantidade inválida no upgrade.");
  }

  // 🔒 3. Buscar contrato atual
  const { data: contrato, error: contratoErr } = await supabase
    .from("contratos")
    .select("limite_usuarios")
    .eq("id", contratoId)
    .maybeSingle();

  if (contratoErr) {
    throw new Error("Erro ao buscar contrato.");
  }

  const limiteAnterior = Number(contrato?.limite_usuarios ?? 0);
  const limiteNovo = limiteAnterior + quantidade;

  const now = new Date().toISOString();

  // ✅ 4. Atualiza contrato (incremento real)
  const { error: contratoUpdateErr } = await supabase
    .from("contratos")
    .update({
      limite_usuarios: limiteNovo,
      atualizado_em: now,
    })
    .eq("id", contratoId);

  if (contratoUpdateErr) {
    throw new Error("Erro ao atualizar contrato.");
  }

  // ✅ 5. Atualiza upgrade (marca como pago)
  const { data: updatedRows, error: upgradeUpdateErr } = await supabase
    .from("contratos_upgrades")
    .update({
      limite_anterior: limiteAnterior,
      limite_novo: limiteNovo,
      pagarme_payment_status: "paid",
      paid_at: now,
    })
    .eq("pagarme_order_id", orderId) // ✅ MUITO MAIS SEGURO
    .select();

  if (upgradeUpdateErr) {
    console.error("❌ Erro ao atualizar upgrade:", upgradeUpdateErr);
    throw new Error("Erro ao atualizar upgrade.");
  }

  if (!updatedRows || updatedRows.length === 0) {
    console.error("❌ Nenhuma linha atualizada no upgrade", {
      orderId,
      upgradeId: upgrade.id,
    });
    throw new Error("Upgrade não foi atualizado.");
  }

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

  // ✅ 1. Tenta atualizar o contrato de forma condicional (somente se não estiver ativo)
  const { data: updatedContrato, error: updateErr } = await supabase
    .from("contratos")
    .update({
      status: "ativo",
      pagarme_order_id: pagarmeOrderId,
      pagarme_payment_status: pagarmePaymentStatus ?? "paid",
      atualizado_em: nowISO(),
    })
    .eq("id", contratoId)
    .neq("status", "ativo")
    .select("id, criado_por, status, cliente_id")
    .maybeSingle();

  if (updateErr) {
    console.error("[activateContratoFull] update error:", updateErr);
    throw new Error("Erro ao ativar contrato.");
  }

  const contrato = updatedContrato as ContratoRow | null;

  // Se nenhuma linha foi atualizada, pode estar já ativo — buscar estado atual
  if (!contrato) {
    const existing = await getContrato(supabase, contratoId);
    if (existing?.status === "ativo") {
      return {
        activated: true,
        alreadyActive: true,
        status: pagarmePaymentStatus,
      };
    }
    // não foi possível ativar por outro motivo
    throw new Error("Erro ao ativar contrato (não atualizado)");
  }

  // ✅ 2. Idempotência (protege contra webhook duplicado)
  const alreadyActive = contrato.status === "ativo";

  // ✅ 3. Define usuário alvo (melhorável futuramente com campo dedicado)
  // ✅ 3. Define usuário alvo e valida ownership quando `userId` vier do gateway
  let targetUserId = params.userId ?? contrato.criado_por;

  if (params.userId && params.userId !== contrato.criado_por) {
    // valida que o userId pertence ao mesmo cliente do contrato
    const { data: userRow } = await supabase
      .from("usuarios")
      .select("id")
      .eq("id", params.userId)
      .eq("cliente_id", contrato.cliente_id)
      .maybeSingle();

    if (!userRow) {
      console.warn(
        "[activateContratoFull] userId fornecido no webhook não pertence ao contrato, ignorando:",
        params.userId,
      );
      targetUserId = contrato.criado_por;
    }
  }

  if (targetUserId) {
    const { error: userUpdateErr } = await supabase
      .from("usuarios")
      .update({
        ativo: true,
        updated_at: nowISO(),
      })
      .eq("id", targetUserId);

    if (userUpdateErr) {
      console.error(
        "[activateContratoFull] erro ao ativar usuário:",
        userUpdateErr,
      );
      throw new Error("Erro ao ativar usuário responsável.");
    }
  }

  // ✅ 4. Evento: contrato ativado
  await recordWebhookEvent(supabase, {
    contrato_id: contratoId,
    tipo: "contrato_ativado",
    descricao: "Contrato ativado após pagamento confirmado",
    dados: {
      pagarme_order_id: pagarmeOrderId,
      status: pagarmePaymentStatus,
    },
  });

  // ✅ 5. Evento: PDF marcado como pendente (gera antes para rastreabilidade)
  await recordWebhookEvent(supabase, {
    contrato_id: contratoId,
    tipo: "pdf_pending",
    descricao: "PDF marcado para geração",
  });

  // ✅ 6. Atualiza status do PDF (processo assíncrono)
  const { error: pdfUpdateErr } = await supabase
    .from("contratos")
    .update({
      pdf_status: "pending",
      pdf_error: null,
      pdf_attempts: 0,
    })
    .eq("id", contratoId);

  if (pdfUpdateErr) {
    console.error("[PDF] erro ao marcar como pending:", pdfUpdateErr);

    // ✅ registra falha de flag
    await recordWebhookEvent(supabase, {
      contrato_id: contratoId,
      tipo: "pdf_flag_failed",
      descricao: pdfUpdateErr.message,
    });
  }

  // ✅ 7. Retorno padronizado
  return {
    activated: true,
    alreadyActive,
    status: pagarmePaymentStatus,
  };
}
