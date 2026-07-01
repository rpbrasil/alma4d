// app/api/pagarme/verificar-pix/route.ts
import { NextResponse } from "next/server";
import { fetchPagarmeOrder, PagarmeOrderResponse } from "@/lib/pagarme";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { activateContratoFull, getContrato } from "@/lib/contratos-flow";

type Body = {
  contrato_id?: string;
  pagarme_order_id?: string;
};

function firstCharge(order: PagarmeOrderResponse) {
  return Array.isArray(order.charges) ? order.charges[0] : undefined;
}

export async function POST(req: Request) {
  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    body = {};
  }

  const supabase = getSupabaseAdmin();

  let contratoId = body.contrato_id ?? null;
  let pagarmeOrderId = body.pagarme_order_id ?? null;

  if (!contratoId && !pagarmeOrderId) {
    return NextResponse.json(
      { error: "Envie contrato_id ou pagarme_order_id" },
      { status: 400 },
    );
  }

  if (!contratoId && pagarmeOrderId) {
    const { data } = await supabase
      .from("contratos")
      .select("id")
      .eq("pagarme_order_id", pagarmeOrderId)
      .limit(1)
      .maybeSingle();

    contratoId = data?.id ?? null;
  }

  if (!contratoId) {
    return NextResponse.json(
      { error: "Contrato não encontrado" },
      { status: 404 },
    );
  }

  const contrato = await getContrato(supabase, contratoId);
  if (!contrato) {
    return NextResponse.json(
      { error: "Contrato não encontrado" },
      { status: 404 },
    );
  }

  if (!pagarmeOrderId) {
    const { data } = await supabase
      .from("contratos")
      .select("pagarme_order_id")
      .eq("id", contratoId)
      .single();

    pagarmeOrderId = data?.pagarme_order_id ?? null;
  }

  if (!pagarmeOrderId) {
    return NextResponse.json(
      { error: "pagarme_order_id ausente no contrato" },
      { status: 400 },
    );
  }

  let order: PagarmeOrderResponse;
  try {
    order = await fetchPagarmeOrder(pagarmeOrderId);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Falha ao consultar Pagar.me", detail: msg },
      { status: 502 },
    );
  }

  const ch = firstCharge(order);
  const status = String(ch?.status ?? order.status ?? "").toLowerCase();
  const paymentMethod = String(ch?.payment_method ?? "").toLowerCase();

  const isPaid = status === "paid";
  const isPix = paymentMethod === "pix";

  if (!isPix) {
    return NextResponse.json({
      ok: true,
      checked: true,
      message: "Order não parece ser PIX (payment_method != pix).",
      pagarme_order_id: pagarmeOrderId,
      status,
      payment_method: paymentMethod,
    });
  }

  if (!isPaid) {
    return NextResponse.json({
      ok: true,
      checked: true,
      paid: false,
      pagarme_order_id: pagarmeOrderId,
      status,
      payment_method: paymentMethod,
    });
  }

  const cupomFromGatewayRaw = order.metadata?.["cupom_codigo"];
  const cupomFromGateway = cupomFromGatewayRaw
    ? String(cupomFromGatewayRaw).trim().toUpperCase()
    : null;
  const userIdRaw = order.metadata?.["user_id"];
  const userId = userIdRaw ? String(userIdRaw) : null;

  await activateContratoFull({
    supabase,
    contratoId,
    pagarmeOrderId,
    pagarmePaymentStatus: status,
    cupomFromGateway,
    userId,
  });

  // ✅ Operações pós-ativação: financeiro, NFS-e, e-mail

  // 0b. Geração de PDF (fire-and-forget)
  try {
    const BASE_URL = process.env.BASE_URL ?? "";
    const PDF_SECRET = process.env.PDF_WORKER_SECRET ?? "";
    if (BASE_URL && PDF_SECRET) {
      fetch(`${BASE_URL}/api/contrato/pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-pdf-worker-secret": PDF_SECRET,
        },
        body: JSON.stringify({ contratoId: contratoId }),
      }).catch((e) =>
        console.error("[verificar-pix] PDF generation failed:", e),
      );
    }
  } catch (e) {
    console.error("[verificar-pix] PDF trigger failed:", e);
  }

  // 1. Lançamento financeiro (idempotente por ref_externo)
  try {
    const { data: cd } = await supabase
      .from("contratos")
      .select("cliente_id, valor_mensal, valor_total")
      .eq("id", contratoId)
      .maybeSingle();

    if (cd) {
      const amountCents =
        typeof order.amount === "number" ? order.amount : null;
      let valor: number | null = null;
      if (amountCents != null) {
        valor = amountCents / 100;
      } else {
        const base = cd.valor_mensal ?? cd.valor_total ?? null;
        valor =
          typeof base === "number"
            ? base
            : typeof base === "string"
              ? Number(base) || null
              : null;
      }

      if (valor != null) {
        const { data: lancExist } = await supabase
          .from("financeiro_lancamentos")
          .select("id")
          .eq("ref_externo", pagarmeOrderId)
          .maybeSingle();

        if (!lancExist) {
          await supabase.from("financeiro_lancamentos").insert({
            cliente_id: cd.cliente_id,
            contrato_id: contratoId,
            tipo: "receita",
            categoria: "assinatura",
            valor,
            moeda: "BRL",
            descricao: "Pagamento inicial via gateway",
            data_competencia: new Date().toISOString(),
            data_pagamento: new Date().toISOString(),
            origem: "pagarme",
            ref_externo: pagarmeOrderId,
            metadata: { gateway: "pagarme" },
          });
        }
      }
    }
  } catch (e) {
    console.error("[verificar-pix] financeiro insert failed:", e);
  }

  // 2. Emissão de NFS-e (idempotente por ref interno do endpoint)
  try {
    const BASE_URL = process.env.BASE_URL ?? "";
    const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? "";
    if (BASE_URL && INTERNAL_SECRET) {
      const nfseRes = await fetch(`${BASE_URL}/api/nfse/emitir`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": INTERNAL_SECRET,
        },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({ contrato_id: contratoId }),
      });
      if (nfseRes.ok) {
        await supabase
          .from("pagamento_processos")
          .update({ nfse_emitida: true })
          .eq("contrato_id", contratoId);
      } else {
        console.error(
          "[verificar-pix] nfse emission returned",
          nfseRes.status,
          await nfseRes.text().catch(() => ""),
        );
      }
    }
  } catch (e) {
    console.error("[verificar-pix] nfse emission failed:", e);
  }

  // 3. E-mail de confirmação de pagamento
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
    const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    if (SUPABASE_URL && SERVICE_ROLE_KEY) {
      const emailRes = await fetch(
        `${SUPABASE_URL}/functions/v1/email_notify`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tipo: "pagamento_confirmado",
            contrato_id: contratoId,
            dashboard_url: process.env.BASE_URL,
            express_url: `${process.env.BASE_URL}/dashboard/express`,
          }),
        },
      );
      if (emailRes.ok) {
        await supabase
          .from("pagamento_processos")
          .update({
            pagamento_confirmado_enviado: true,
            pagamento_status: "paid",
          })
          .eq("contrato_id", contratoId);
      } else {
        console.error(
          "[verificar-pix] email_notify failed:",
          await emailRes.text().catch(() => ""),
        );
      }
    }
  } catch (e) {
    console.error("[verificar-pix] email notify failed:", e);
  }

  return NextResponse.json({
    ok: true,
    checked: true,
    paid: true,
    activated: true,
    contrato_id: contratoId,
    pagarme_order_id: pagarmeOrderId,
  });
}
