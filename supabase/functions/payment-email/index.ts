import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { paymentConfirmedTemplate } from "../_shared/emailTemplates.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

/* ===================== EMAIL ===================== */

async function sendEmailResend(params: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY não configurada");
    return { ok: false };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "alma4D <cliente@voss.digital>",
      to: params.to,
      subject: params.subject,
      html: params.html,
    }),
  });

  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, raw: json };
}

/* ===================== HANDLER ===================== */

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // ⚠️ Se isso vier do front, não use service role aqui
  const auth = req.headers.get("authorization") ?? "";
  if (
    !auth.startsWith("Bearer ") ||
    auth.slice(7) !== SUPABASE_SERVICE_ROLE_KEY
  ) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const body = await req.json().catch(() => ({}));

  const tipo = String(body.tipo ?? "");
  const contrato_id = String(body.contrato_id ?? "");
  const dashboard_url = String(body.dashboard_url ?? "");
  const express_url = String(body.express_url ?? "");

  if (!tipo || !contrato_id) {
    return new Response(
      JSON.stringify({ error: "tipo e contrato_id são obrigatórios" }),
      { status: 400 },
    );
  }

  const { data: contrato } = await supabaseAdmin
    .from("contratos")
    .select(
      "numero_contrato, pdf_url, pdf_assinado_url, criado_por, forma_pagamento",
    )
    .eq("id", contrato_id)
    .maybeSingle();

  if (!contrato) {
    return new Response(JSON.stringify({ error: "Contrato não encontrado" }), {
      status: 404,
    });
  }

  const { data: usuario } = await supabaseAdmin
    .from("usuarios")
    .select("nome_completo, email")
    .eq("id", contrato.criado_por)
    .maybeSingle();

  if (!usuario?.email) {
    return new Response(JSON.stringify({ error: "Email do usuário ausente" }), {
      status: 400,
    });
  }

  const nome = usuario.nome_completo ?? "Cliente";

  if (tipo === "pagamento_confirmado") {
    const contratoUrl = contrato.pdf_assinado_url ?? contrato.pdf_url ?? "";

    let subject = "";
    let html = "";

    try {
      const tpl = paymentConfirmedTemplate({
        nome,
        numeroContrato: contrato.numero_contrato,
        metodo: contrato.forma_pagamento,
        dashboardUrl: dashboard_url,
        expressUrl: express_url,
        contratoUrl: contratoUrl || null,
      });

      subject = tpl.subject;
      html = tpl.html;
    } catch (err) {
      console.error("Erro no template:", err);

      subject = "Pagamento confirmado ✅";
      html = `
        <h2>Pagamento confirmado ✅</h2>
        <p>Olá ${nome},</p>
        <p>Seu pagamento foi confirmado com sucesso.</p>
        <a href="${dashboard_url}">Acessar Dashboard</a><br/>
        <a href="${express_url}">Acessar Express</a>
        ${
          contratoUrl
            ? `<p>Contrato: <a href="${contratoUrl}">abrir PDF</a></p>`
            : `<p>Contrato será disponibilizado em breve.</p>`
        }
        <p>A Nota Fiscal será enviada assim que for autorizada.</p>
      `;
    }

    const sent = await sendEmailResend({
      to: usuario.email,
      subject,
      html,
    });

    if (!sent.ok) {
      console.error("Erro Resend:", sent.raw);

      return new Response(
        JSON.stringify({
          error: "Falha ao enviar email",
          details: sent.raw,
        }),
        { status: 502 },
      );
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  return new Response(JSON.stringify({ error: "Tipo não suportado" }), {
    status: 400,
  });
});