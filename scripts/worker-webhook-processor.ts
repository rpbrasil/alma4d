#!/usr/bin/env ts-node
import "dotenv/config";
import { supabaseAdmin } from "../app/lib/contratos-flow";
import { extractGatewayData } from "../app/lib/pagarme";
import {
  activateContratoFull,
  applyContratoUpgrade,
  markFailOrCancel,
} from "../app/lib/contratos-flow";

const MAX_ATTEMPTS = Number(process.env.WEBHOOK_MAX_ATTEMPTS ?? 5);

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchNextJob(supabase: any) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("webhook_jobs")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_at", now)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function claimJob(supabase: any, job: any) {
  const { error, data } = await supabase
    .from("webhook_jobs")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", job.id)
    .eq("status", "pending")
    .select();

  if (error) throw error;
  return data && data.length > 0;
}

async function moveToDeadLetter(supabase: any, job: any, err: unknown) {
  await supabase.from("webhook_dead_letter").insert({
    job_id: job.id,
    error: String((err as any)?.message ?? err),
    payload: job.raw_event,
  });

  await supabase
    .from("webhook_jobs")
    .update({ status: "failed", updated_at: new Date().toISOString() })
    .eq("id", job.id);
}

async function processJob(supabase: any, job: any) {
  try {
    const evt = job.raw_event;
    const g = extractGatewayData(evt);

    // if no contratoId, mark done
    if (!g.contratoId) {
      await supabase
        .from("webhook_jobs")
        .update({ status: "done", updated_at: new Date().toISOString() })
        .eq("id", job.id);
      await supabase
        .from("webhook_logs")
        .update({ processado: true, processed_at: new Date().toISOString() })
        .eq("event_hash", job.event_hash);
      return;
    }

    // ignore charge.paid
    if (g.eventType === "charge.paid") {
      await supabase
        .from("webhook_jobs")
        .update({ status: "done", updated_at: new Date().toISOString() })
        .eq("id", job.id);
      await supabase
        .from("webhook_logs")
        .update({ processado: true, processed_at: new Date().toISOString() })
        .eq("event_hash", job.event_hash);
      return;
    }

    // detect upgrade
    const { data: upgradeRow } = g.orderId
      ? await supabase
          .from("contratos_upgrades")
          .select("*")
          .eq("pagarme_order_id", g.orderId)
          .maybeSingle()
      : { data: null };
    const isUpgrade = !!upgradeRow;

    if (isUpgrade && upgradeRow?.paid_at) {
      await supabase
        .from("webhook_jobs")
        .update({ status: "done", updated_at: new Date().toISOString() })
        .eq("id", job.id);
      await supabase
        .from("webhook_logs")
        .update({ processado: true, processed_at: new Date().toISOString() })
        .eq("event_hash", job.event_hash);
      return;
    }

    if (
      g.eventType === "order.payment_failed" ||
      g.eventType === "order.canceled"
    ) {
      const kind = g.eventType === "order.canceled" ? "canceled" : "failed";
      await markFailOrCancel({
        supabase,
        contratoId: g.contratoId,
        pagarmeOrderId: g.orderId,
        pagarmePaymentStatus: g.paymentStatus,
        paymentMethod: g.paymentMethod,
        eventType: g.eventType,
        kind,
        eventId: g.eventId,
      });

      await supabase
        .from("webhook_jobs")
        .update({ status: "done", updated_at: new Date().toISOString() })
        .eq("id", job.id);
      await supabase
        .from("webhook_logs")
        .update({ processado: true, processed_at: new Date().toISOString() })
        .eq("event_hash", job.event_hash);
      return;
    }

    if (isUpgrade) {
      await applyContratoUpgrade({
        supabase,
        contratoId: g.contratoId,
        orderId: g.orderId,
        paymentStatus: g.paymentStatus ?? "paid",
      });

      await supabase
        .from("webhook_jobs")
        .update({ status: "done", updated_at: new Date().toISOString() })
        .eq("id", job.id);
      await supabase
        .from("webhook_logs")
        .update({ processado: true, processed_at: new Date().toISOString() })
        .eq("event_hash", job.event_hash);
      return;
    }

    if (g.eventType === "order.paid") {
      await activateContratoFull({
        supabase,
        contratoId: g.contratoId,
        pagarmeOrderId: g.orderId,
        pagarmePaymentStatus: g.paymentStatus ?? "paid",
        cupomFromGateway: g.cupomCodigo ?? null,
        userId: g.userId,
      });

      await supabase
        .from("webhook_jobs")
        .update({ status: "done", updated_at: new Date().toISOString() })
        .eq("id", job.id);
      await supabase
        .from("webhook_logs")
        .update({ processado: true, processed_at: new Date().toISOString() })
        .eq("event_hash", job.event_hash);
      return;
    }

    // default: mark done
    await supabase
      .from("webhook_jobs")
      .update({ status: "done", updated_at: new Date().toISOString() })
      .eq("id", job.id);
    await supabase
      .from("webhook_logs")
      .update({ processado: true, processed_at: new Date().toISOString() })
      .eq("event_hash", job.event_hash);
  } catch (err) {
    // handle retry/backoff
    const attempts = (job.attempts || 0) + 1;
    if (attempts >= MAX_ATTEMPTS) {
      await moveToDeadLetter(supabase, job, err);
    } else {
      const backoffSeconds = Math.min(60 * Math.pow(2, attempts - 1), 3600);
      const nextAt = new Date(Date.now() + backoffSeconds * 1000).toISOString();
      await supabase
        .from("webhook_jobs")
        .update({
          attempts,
          last_error: String((err as any)?.message ?? err),
          scheduled_at: nextAt,
          status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
    }
  }
}

async function run() {
  const supabase = supabaseAdmin();

  const runOnce =
    process.env.RUN_ONCE === "1" || process.env.RUN_ONCE === "true";

  while (true) {
    const job = await fetchNextJob(supabase);
    if (!job) {
      if (runOnce) return;
      await sleep(2000);
      continue;
    }

    const claimed = await claimJob(supabase, job);
    if (!claimed) {
      if (runOnce) return;
      continue;
    }

    await processJob(supabase, job);

    if (runOnce) return;
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
