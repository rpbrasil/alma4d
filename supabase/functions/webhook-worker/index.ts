import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

type UnknownError = { message?: string };

function nowISO() {
  return new Date().toISOString();
}

type WebhookJob = {
  id: string;
  raw_event?: Record<string, unknown> | null;
  contrato_id?: string | null;
  order_id?: string | null;
  attempts?: number | null;
  event_hash?: string | null;
  status?: string | null;
};

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

async function fetchNextJobs(limit = 10): Promise<WebhookJob[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("webhook_jobs")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_at", now)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

async function claimJob(jobId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("webhook_jobs")
    .update({ status: "processing", updated_at: nowISO() })
    .eq("id", jobId)
    .eq("status", "pending")
    .select();

  if (error) throw error;
  return (data && data.length > 0) || false;
}

async function markDone(job: WebhookJob) {
  await supabaseAdmin
    .from("webhook_jobs")
    .update({ status: "done", updated_at: nowISO() })
    .eq("id", job.id);

  if (job.event_hash) {
    await supabaseAdmin
      .from("webhook_logs")
      .update({ processado: true, processed_at: nowISO() })
      .eq("event_hash", job.event_hash);
  }
}

async function processPaid(
  contratoId: string,
  orderId: string | null,
  raw: Record<string, unknown> | null,
) {
  const now = nowISO();

  // Try to activate contract only if not active
  const { data: updated } = await supabaseAdmin
    .from("contratos")
    .update({
      status: "ativo",
      pagarme_order_id: orderId,
      pagarme_payment_status: (raw?.data?.status ?? "paid") as string,
      atualizado_em: now,
    })
    .eq("id", contratoId)
    .neq("status", "ativo")
    .select();

  if (!updated || updated.length === 0) {
    // already active or not updated
    return { alreadyActive: true };
  }

  // record events
  await supabaseAdmin.from("contrato_eventos").insert({
    contrato_id: contratoId,
    tipo: "contrato_ativado",
    descricao: "Ativado via worker",
    dados: { orderId, raw },
    gateway_event_id: raw?.id ?? null,
  });

  await supabaseAdmin.from("contrato_eventos").insert({
    contrato_id: contratoId,
    tipo: "pdf_pending",
    descricao: "PDF enfileirado para geração",
  });

  await supabaseAdmin
    .from("contratos")
    .update({ pdf_status: "pending", pdf_error: null, pdf_attempts: 0 })
    .eq("id", contratoId);

  // --- create financeiro lancamento if not exists ---
  try {
    const { data: contrato } = await supabaseAdmin
      .from("contratos")
      .select("cliente_id, valor_mensal, valor_total")
      .eq("id", contratoId)
      .maybeSingle();

    const valorCents = raw?.data?.amount ?? raw?.data?.order?.amount ?? null;
    let valor = null;
    if (typeof valorCents === "number") valor = valorCents / 100;
    if (valor == null && contrato) {
      const base = contrato.valor_mensal ?? contrato.valor_total ?? null;
      if (typeof base === "number") valor = base;
      else if (typeof base === "string") valor = Number(base) || null;
    }

    if (orderId && contrato && valor != null) {
      const { data: lancExist } = await supabaseAdmin
        .from("financeiro_lancamentos")
        .select("id")
        .eq("ref_externo", orderId)
        .maybeSingle();

      if (!lancExist) {
        await supabaseAdmin.from("financeiro_lancamentos").insert({
          cliente_id: contrato.cliente_id,
          contrato_id: contratoId,
          tipo: "receita",
          categoria: "assinatura",
          valor: valor,
          moeda: "BRL",
          descricao: "Pagamento inicial via gateway",
          data_competencia: nowISO(),
          data_pagamento: nowISO(),
          origem: "pagarme",
          ref_externo: orderId,
          metadata: { gateway: "pagarme" },
        });
      }
    }
  } catch (e) {
    console.error("[worker] financeiro insert failed", e);
  }

  // --- request NFSe emission and send confirmation email ---
  try {
    const BASE_URL = Deno.env.get("BASE_URL") ?? "";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (BASE_URL) {
      const nfseRes = await fetch(`${BASE_URL}/api/nfse/emitir`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": Deno.env.get("INTERNAL_API_SECRET") ?? "",
        },
        body: JSON.stringify({
          contrato_id: contratoId,
          ref: `nfse_ativacao_${orderId ?? nowISO()}`,
          tipo: "ativacao",
        }),
      });

      if (nfseRes.ok) {
        await supabaseAdmin
          .from("pagamento_processos")
          .update({ nfse_emitida: true })
          .eq("contrato_id", contratoId);
      } else {
        console.error("NFSe emit failed", await nfseRes.text().catch(() => ""));
      }
    }

    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const emailRes = await fetch(
        `${SUPABASE_URL}/functions/v1/email_notify`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tipo: "pagamento_confirmado",
            contrato_id: contratoId,
          }),
        },
      );

      if (emailRes.ok) {
        await supabaseAdmin
          .from("pagamento_processos")
          .update({
            pagamento_confirmado_enviado: true,
            pagamento_status: "paid",
          })
          .eq("contrato_id", contratoId);
      } else {
        console.error(
          "email_notify failed",
          await emailRes.text().catch(() => ""),
        );
      }
    }
  } catch (e) {
    console.error("[worker] nfse/email step failed", e);
  }

  return { activated: true };
}

async function processJob(job: WebhookJob) {
  const raw = (job.raw_event ?? null) as Record<string, unknown> | null;

  // determine eventType and contratoId
  const eventType = (
    (isRecord(raw) &&
      (raw["type"] ??
        (isRecord(raw["data"]) && raw["data"]["type"]) ??
        (isRecord(raw["data"]) && raw["data"]["status"]))) ??
    ""
  )
    .toString()
    .toLowerCase();

  let contratoId: string | null = job.contrato_id ?? null;
  if (
    !contratoId &&
    isRecord(raw) &&
    isRecord(raw["data"]) &&
    typeof raw["data"]["metadata"] === "object"
  ) {
    const md = raw["data"]["metadata"] as Record<string, unknown>;
    contratoId = (md["contrato_id"] ? String(md["contrato_id"]) : null) as
      | string
      | null;
  }

  let orderId: string | null = job.order_id ?? null;
  if (!orderId && isRecord(raw)) {
    const data = raw["data"];
    if (isRecord(data)) {
      if (data["id"]) orderId = String(data["id"]);
      else if (data["order_id"]) orderId = String(data["order_id"]);
    }
    if (!orderId && raw["order_id"]) orderId = String(raw["order_id"]);
  }

  if (!contratoId) {
    await markDone(job);
    return;
  }

  // handle failure / canceled
  if (eventType.includes("payment_failed") || eventType.includes("canceled")) {
    await supabaseAdmin
      .from("contratos")
      .update({ pagarme_payment_status: eventType, atualizado_em: nowISO() })
      .eq("id", contratoId);

    await supabaseAdmin.from("contrato_eventos").insert({
      contrato_id: contratoId,
      tipo: "pagamento_failed_or_canceled",
      descricao: `Processed ${eventType}`,
      dados: { raw },
    });

    await markDone(job);
    return;
  }

  // detect upgrade by order_id
  if (orderId) {
    const { data: upgradeRaw } = await supabaseAdmin
      .from("contratos_upgrades")
      .select(
        "id, contrato_id, quantidade_adicional, limite_anterior, limite_novo, paid_at, cliente_id, subtotal_cents, total_cents, preco_unitario",
      )
      .eq("pagarme_order_id", orderId)
      .maybeSingle();
    const upgrade = (upgradeRaw ?? null) as Record<string, unknown> | null;

    if (upgrade && !upgrade["paid_at"]) {
      // mark upgrade paid and increment contract limit
      const quantidade = Number(upgrade.quantidade_adicional ?? 0) || 0;
      if (quantidade > 0) {
        const { data: contrato } = await supabaseAdmin
          .from("contratos")
          .select("limite_usuarios")
          .eq("id", upgrade.contrato_id)
          .maybeSingle();

        const limiteAnterior = Number(contrato?.limite_usuarios ?? 0);
        const limiteNovo = limiteAnterior + quantidade;

        await supabaseAdmin
          .from("contratos")
          .update({ limite_usuarios: limiteNovo, atualizado_em: nowISO() })
          .eq("id", upgrade.contrato_id);

        await supabaseAdmin
          .from("contratos_upgrades")
          .update({
            pagarme_payment_status: "paid",
            paid_at: nowISO(),
            limite_anterior: limiteAnterior,
            limite_novo: limiteNovo,
          })
          .eq("id", upgrade.id);
        // Create financeiro lancamento for upgrade if not exists (compute valor)
        try {
          const { data: lancExist } = await supabaseAdmin
            .from("financeiro_lancamentos")
            .select("id")
            .eq("ref_externo", orderId)
            .maybeSingle();

          if (!lancExist) {
            // compute valor: prefer total_cents, fallback to preco_unitario * quantidade_adicional
            let valor: number | null = null;
            const totalCents =
              typeof upgrade["total_cents"] === "number"
                ? (upgrade["total_cents"] as number)
                : typeof upgrade["total_cents"] === "string"
                  ? Number(upgrade["total_cents"])
                  : null;
            if (totalCents && Number.isFinite(totalCents)) {
              valor = totalCents / 100;
            } else if (
              upgrade["preco_unitario"] != null &&
              upgrade["quantidade_adicional"] != null
            ) {
              const preco = Number(upgrade["preco_unitario"]);
              const qtd = Number(upgrade["quantidade_adicional"]);
              if (Number.isFinite(preco) && Number.isFinite(qtd))
                valor = preco * qtd;
            }

            await supabaseAdmin.from("financeiro_lancamentos").insert({
              cliente_id: upgrade["cliente_id"],
              contrato_id: upgrade["contrato_id"],
              tipo: "receita",
              categoria: "upgrade_licencas",
              valor: valor,
              moeda: "BRL",
              descricao: `Upgrade de ${upgrade["quantidade_adicional"]} licenças`,
              data_competencia: nowISO(),
              data_pagamento: nowISO(),
              origem: "pagarme",
              ref_externo: orderId,
              metadata: { upgrade_id: upgrade["id"] },
            });
          }
        } catch (e) {
          console.error("[worker] financeiro upgrade failed", e);
        }

        // Call NFSe and email notify for upgrade
        try {
          const BASE_URL = Deno.env.get("BASE_URL") ?? "";
          const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
          const SUPABASE_SERVICE_ROLE_KEY =
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

          if (BASE_URL) {
            const refUpgrade = `nfse_upgrade_${upgrade.id}`;
            const nfseRes = await fetch(`${BASE_URL}/api/nfse/emitir`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-internal-secret": Deno.env.get("INTERNAL_API_SECRET") ?? "",
              },
              body: JSON.stringify({
                contrato_id: upgrade.contrato_id,
                ref: refUpgrade,
                tipo: "upgrade",
              }),
            });

            if (nfseRes.ok) {
              await supabaseAdmin
                .from("pagamento_processos")
                .update({ nfse_emitida: true })
                .eq("contrato_id", upgrade.contrato_id);
            } else {
              console.error(
                "NFSe upgrade failed",
                await nfseRes.text().catch(() => ""),
              );
            }
          }

          if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
            const emailRes = await fetch(
              `${SUPABASE_URL}/functions/v1/email_notify`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  tipo: "pagamento_confirmado",
                  contrato_id: upgrade.contrato_id,
                }),
              },
            );

            if (emailRes.ok) {
              await supabaseAdmin
                .from("pagamento_processos")
                .update({
                  pagamento_confirmado_enviado: true,
                  pagamento_status: "paid",
                })
                .eq("contrato_id", upgrade.contrato_id);
            } else {
              console.error(
                "email_notify upgrade failed",
                await emailRes.text().catch(() => ""),
              );
            }
          }
        } catch (e) {
          console.error("[worker] nfse/email upgrade failed", e);
        }
      }

      await markDone(job);
      return;
    }
  }

  // default: if order.paid, activate
  if (eventType.includes("order.paid") || eventType.includes("paid")) {
    await processPaid(contratoId, orderId, raw);
    await markDone(job);
    return;
  }

  // fallback: mark done
  await markDone(job);
}

Deno.serve(async () => {
  try {
    const jobs = await fetchNextJobs(10);

    let processed = 0;
    for (const job of jobs) {
      try {
        const claimed = await claimJob(job.id);
        if (!claimed) continue;
        await processJob(job);
        processed += 1;
      } catch (err) {
        // retry/backoff: increment attempts and schedule next try
        const attempts = (job.attempts ?? 0) + 1;
        if (attempts >= Number(Deno.env.get("WEBHOOK_MAX_ATTEMPTS") ?? "5")) {
          await supabaseAdmin.from("webhook_dead_letter").insert({
            job_id: job.id,
            error: String((err as UnknownError)?.message ?? err),
            payload: job.raw_event,
          });
          await supabaseAdmin
            .from("webhook_jobs")
            .update({ status: "failed", updated_at: nowISO() })
            .eq("id", job.id);
        } else {
          const backoffSeconds = Math.min(60 * Math.pow(2, attempts - 1), 3600);
          const nextAt = new Date(
            Date.now() + backoffSeconds * 1000,
          ).toISOString();
          await supabaseAdmin
            .from("webhook_jobs")
            .update({
              attempts,
              last_error: String((err as UnknownError)?.message ?? err),
              scheduled_at: nextAt,
              status: "pending",
              updated_at: nowISO(),
            })
            .eq("id", job.id);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, processed }), {
      status: 200,
    });
  } catch (err: unknown) {
    const e = err as UnknownError;
    console.error("[webhook-worker] error:", err);
    return new Response(JSON.stringify({ error: e?.message ?? "internal" }), {
      status: 500,
    });
  }
});
