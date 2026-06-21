#!/usr/bin/env ts-node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const contratos_flow_1 = require("../app/lib/contratos-flow");
const pagarme_1 = require("../app/lib/pagarme");
const contratos_flow_2 = require("../app/lib/contratos-flow");
const MAX_ATTEMPTS = Number(process.env.WEBHOOK_MAX_ATTEMPTS ?? 5);
function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}
async function fetchNextJob(supabase) {
    const now = new Date().toISOString();
    const { data, error } = await supabase
        .from("webhook_jobs")
        .select("*")
        .eq("status", "pending")
        .lte("scheduled_at", now)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
    if (error)
        throw error;
    return data || null;
}
async function claimJob(supabase, job) {
    const { error, data } = await supabase
        .from("webhook_jobs")
        .update({ status: "processing", updated_at: new Date().toISOString() })
        .eq("id", job.id)
        .eq("status", "pending")
        .select();
    if (error)
        throw error;
    return data && data.length > 0;
}
async function moveToDeadLetter(supabase, job, err) {
    await supabase.from("webhook_dead_letter").insert({
        job_id: job.id,
        error: String(err?.message ?? err),
        payload: job.raw_event,
    });
    await supabase
        .from("webhook_jobs")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", job.id);
}
async function processJob(supabase, job) {
    try {
        const evt = job.raw_event;
        const g = (0, pagarme_1.extractGatewayData)(evt);
        // if no contratoId, mark done
        if (!g.contratoId) {
            await supabase.from("webhook_jobs").update({ status: "done", updated_at: new Date().toISOString() }).eq("id", job.id);
            await supabase.from("webhook_logs").update({ processado: true, processed_at: new Date().toISOString() }).eq("event_hash", job.event_hash);
            return;
        }
        // ignore charge.paid
        if (g.eventType === "charge.paid") {
            await supabase.from("webhook_jobs").update({ status: "done", updated_at: new Date().toISOString() }).eq("id", job.id);
            await supabase.from("webhook_logs").update({ processado: true, processed_at: new Date().toISOString() }).eq("event_hash", job.event_hash);
            return;
        }
        // detect upgrade
        const { data: upgradeRow } = g.orderId
            ? await supabase.from("contratos_upgrades").select("*").eq("pagarme_order_id", g.orderId).maybeSingle()
            : { data: null };
        const isUpgrade = !!upgradeRow;
        if (isUpgrade && upgradeRow?.paid_at) {
            await supabase.from("webhook_jobs").update({ status: "done", updated_at: new Date().toISOString() }).eq("id", job.id);
            await supabase.from("webhook_logs").update({ processado: true, processed_at: new Date().toISOString() }).eq("event_hash", job.event_hash);
            return;
        }
        if (g.eventType === "order.payment_failed" || g.eventType === "order.canceled") {
            const kind = g.eventType === "order.canceled" ? "canceled" : "failed";
            await (0, contratos_flow_2.markFailOrCancel)({
                supabase,
                contratoId: g.contratoId,
                pagarmeOrderId: g.orderId,
                pagarmePaymentStatus: g.paymentStatus,
                paymentMethod: g.paymentMethod,
                eventType: g.eventType,
                kind,
                eventId: g.eventId,
            });
            await supabase.from("webhook_jobs").update({ status: "done", updated_at: new Date().toISOString() }).eq("id", job.id);
            await supabase.from("webhook_logs").update({ processado: true, processed_at: new Date().toISOString() }).eq("event_hash", job.event_hash);
            return;
        }
        if (isUpgrade) {
            await (0, contratos_flow_2.applyContratoUpgrade)({
                supabase,
                contratoId: g.contratoId,
                orderId: g.orderId,
                paymentStatus: g.paymentStatus ?? "paid",
            });
            await supabase.from("webhook_jobs").update({ status: "done", updated_at: new Date().toISOString() }).eq("id", job.id);
            await supabase.from("webhook_logs").update({ processado: true, processed_at: new Date().toISOString() }).eq("event_hash", job.event_hash);
            return;
        }
        if (g.eventType === "order.paid") {
            await (0, contratos_flow_2.activateContratoFull)({
                supabase,
                contratoId: g.contratoId,
                pagarmeOrderId: g.orderId,
                pagarmePaymentStatus: g.paymentStatus ?? "paid",
                cupomFromGateway: g.cupomCodigo ?? null,
                userId: g.userId,
            });
            await supabase.from("webhook_jobs").update({ status: "done", updated_at: new Date().toISOString() }).eq("id", job.id);
            await supabase.from("webhook_logs").update({ processado: true, processed_at: new Date().toISOString() }).eq("event_hash", job.event_hash);
            return;
        }
        // default: mark done
        await supabase.from("webhook_jobs").update({ status: "done", updated_at: new Date().toISOString() }).eq("id", job.id);
        await supabase.from("webhook_logs").update({ processado: true, processed_at: new Date().toISOString() }).eq("event_hash", job.event_hash);
    }
    catch (err) {
        // handle retry/backoff
        const attempts = (job.attempts || 0) + 1;
        if (attempts >= MAX_ATTEMPTS) {
            await moveToDeadLetter(supabase, job, err);
        }
        else {
            const backoffSeconds = Math.min(60 * Math.pow(2, attempts - 1), 3600);
            const nextAt = new Date(Date.now() + backoffSeconds * 1000).toISOString();
            await supabase.from("webhook_jobs").update({
                attempts,
                last_error: String(err?.message ?? err),
                scheduled_at: nextAt,
                status: "pending",
                updated_at: new Date().toISOString(),
            }).eq("id", job.id);
        }
    }
}
async function run() {
    const supabase = (0, contratos_flow_1.supabaseAdmin)();
    const runOnce = process.env.RUN_ONCE === "1" || process.env.RUN_ONCE === "true";
    while (true) {
        const job = await fetchNextJob(supabase);
        if (!job) {
            if (runOnce)
                return;
            await sleep(2000);
            continue;
        }
        const claimed = await claimJob(supabase, job);
        if (!claimed) {
            if (runOnce)
                return;
            continue;
        }
        await processJob(supabase, job);
        if (runOnce)
            return;
    }
}
run().catch((e) => {
    console.error(e);
    process.exit(1);
});
