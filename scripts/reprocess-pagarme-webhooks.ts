#!/usr/bin/env ts-node
import "dotenv/config";
import { supabaseAdmin } from "../app/lib/contratos-flow";
import { extractGatewayData } from "../app/lib/pagarme";
import {
  activateContratoFull,
  applyContratoUpgrade,
  markFailOrCancel,
} from "../app/lib/contratos-flow";

async function main() {
  const supabase = supabaseAdmin();

  const { data: rows, error } = await supabase
    .from("webhook_logs")
    .select("id, raw_event, event_type, order_id")
    .eq("provider", "pagarme")
    .eq("processado", false)
    .order("received_at", { ascending: true });

  if (error) {
    console.error("Erro ao listar webhook_logs:", error);
    process.exit(1);
  }

  if (!rows || rows.length === 0) {
    console.log("Nenhum webhook pendente encontrado.");
    return;
  }

  for (const row of rows) {
    console.log(`Processing webhook id=${row.id} order=${row.order_id}`);

    let evt: any;
    try {
      evt =
        typeof row.raw_event === "string"
          ? JSON.parse(row.raw_event)
          : row.raw_event;
    } catch (e) {
      console.error(
        "JSON inválido no raw_event, marcando como processado com erro.",
      );
      await supabase
        .from("webhook_logs")
        .update({ processado: true, erro: "invalid_json" })
        .eq("id", row.id);
      continue;
    }

    const g = extractGatewayData(evt);

    try {
      if (!g.contratoId) {
        await supabase
          .from("webhook_logs")
          .update({ processado: true })
          .eq("id", row.id);
        continue;
      }

      // ignore charge.paid
      if (g.eventType === "charge.paid") {
        await supabase
          .from("webhook_logs")
          .update({ processado: true })
          .eq("id", row.id);
        continue;
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
          .from("webhook_logs")
          .update({ processado: true })
          .eq("id", row.id);
        continue;
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
          eventId: g.eventId,
          kind,
        });
        await supabase
          .from("webhook_logs")
          .update({ processado: true })
          .eq("id", row.id);
        continue;
      }

      if (isUpgrade) {
        await applyContratoUpgrade({
          supabase,
          contratoId: g.contratoId,
          orderId: g.orderId,
          paymentStatus: g.paymentStatus ?? "paid",
        });
        await supabase
          .from("webhook_logs")
          .update({ processado: true })
          .eq("id", row.id);
        continue;
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
          .from("webhook_logs")
          .update({ processado: true })
          .eq("id", row.id);
        continue;
      }

      // default: mark processed to avoid infinite loop
      await supabase
        .from("webhook_logs")
        .update({ processado: true })
        .eq("id", row.id);
    } catch (err: any) {
      console.error(
        "Erro processando webhook id=",
        row.id,
        err?.message ?? err,
      );
      await supabase
        .from("webhook_logs")
        .update({ erro: String(err?.message ?? err) })
        .eq("id", row.id);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
