import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  paymentConfirmedTemplate,
  nfseAuthorizedTemplate,
} from "../_shared/emailTemplates.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

/* ================= ENV ================= */

const resend = Deno.env.get("resend") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

/* ================= EMAIL ================= */

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resend}`,
    },
    body: JSON.stringify({
      from: "alma4D <cliente@voss.digital>",
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error("Erro resend:", txt);
  }

  return res.ok;
}

/* ================= HELPERS ================= */

async function getUsuarioByContrato(contrato_id: string) {
  const { data: contrato } = await supabaseAdmin
    .from("contratos")
    .select(
      "criado_por, numero_contrato, forma_pagamento, pdf_url, pdf_assinado_url",
    )
    .eq("id", contrato_id)
    .maybeSingle();

  if (!contrato) return null;

  const { data: usuario } = await supabaseAdmin
    .from("usuarios")
    .select("nome_completo, email")
    .eq("id", contrato.criado_por)
    .maybeSingle();

  if (!usuario?.email) return null;

  return {
    email: usuario.email,
    nome: usuario.nome_completo ?? "Cliente",
    numeroContrato: contrato.numero_contrato,
    metodo: contrato.forma_pagamento,
    contratoUrl: contrato.pdf_assinado_url ?? contrato.pdf_url ?? null,
  };
}

async function sendAndRespond(to: string, subject: string, html: string) {
  const ok = await sendEmail(to, subject, html);

  if (!ok) {
    return new Response(JSON.stringify({ error: "Falha ao enviar email" }), {
      status: 502,
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
  });
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function getString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

/* ================= HANDLER ================= */

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  /* ===== AUTH ===== */

  const auth = req.headers.get("authorization") ?? "";

  if (!auth.startsWith("Bearer ") || auth.slice(7) !== SERVICE_ROLE) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  /* ===== INPUT ===== */

  const body = await req.json().catch(() => ({}));

  const tipo = String(body.tipo ?? "");
  const contrato_id = String(body.contrato_id ?? "");

  if (!tipo || !contrato_id) {
    return new Response(
      JSON.stringify({ error: "tipo e contrato_id obrigatórios" }),
      { status: 400 },
    );
  }

  const base = await getUsuarioByContrato(contrato_id);

  if (!base) {
    return new Response(JSON.stringify({ error: "Usuário não encontrado" }), {
      status: 404,
    });
  }
  if (!base.email) {
    return new Response(JSON.stringify({ error: "Email inválido" }), {
      status: 400
    });
  }

  const dashboard_url = String(body.dashboard_url ?? "");
  const express_url = String(body.express_url ?? "");

  let subject = "";
  let html = "";

  /* ================= ROUTER ================= */

  switch (tipo) {
    case "pagamento_confirmado": {
      const tpl = paymentConfirmedTemplate({
        nome: base.nome,
        numeroContrato: base.numeroContrato,
        metodo: base.metodo,
        dashboardUrl: dashboard_url,
        expressUrl: express_url,
        contratoUrl: base.contratoUrl,
      });

      subject = tpl.subject;
      html = tpl.html;
      break;
    }

    case "boleto_gerado": {
      const linha = String(body.linha_digitavel ?? "");
      const url = String(body.boleto_url ?? "");
      const vencimento = String(body.vencimento ?? "");

      const tpl = paymentConfirmedTemplate({
        nome: base.nome,
        numeroContrato: base.numeroContrato,
        metodo: "boleto",
        dashboardUrl: dashboard_url,
        expressUrl: express_url,
        contratoUrl: base.contratoUrl,
      });

      subject = "Seu boleto foi gerado 💳";
      html =
        tpl.html.replace("Pagamento confirmado ✅", "Boleto gerado 💳") +
        `
        <p><b>Vencimento:</b> ${vencimento || "—"}</p>
        <p><b>Linha digitável:</b><br/>${linha}</p>
        <p><a href="${url}">Abrir boleto</a></p>
      `;
      break;
    }

    case "pix_gerado": {
      const copia = String(body.pix_copia_cola ?? "");
      const valor = Number(body.valor ?? 0);

      const tpl = paymentConfirmedTemplate({
        nome: base.nome,
        numeroContrato: base.numeroContrato,
        metodo: "pix",
        dashboardUrl: dashboard_url,
        expressUrl: express_url,
        contratoUrl: base.contratoUrl,
      });

      subject = "Pagamento pendente via Pix ⚠️";
      html =
        tpl.html.replace(
          "Pagamento confirmado ✅",
          "Pagamento pendente via Pix",
        ) +
        `
        <p>💰 Valor: R$ ${(valor / 100).toFixed(2)}</p>
        <p>Copie o código abaixo para pagar:</p>
        <pre>${copia}</pre>
      `;
      break;
    }

    case "pagamento_falhou": {
      subject = "Problema no pagamento ⚠️";
      html = `
        <p>Olá ${base.nome},</p>
        <p>Não conseguimos confirmar seu pagamento.</p>
        <p>Tente novamente no painel.</p>
      `;
      break;
    }
  
    case "nfse_autorizada": {
      const ref = String(body.ref ?? "");

      if (!ref) {
        return new Response(JSON.stringify({ error: "ref obrigatório" }), {
          status: 400,
        });
      }

      // ✅ buscar nfse
      const { data: nfse } = await supabaseAdmin
        .from("nfse_emissoes")
        .select("cliente_id, resposta")
        .eq("ref", ref)
        .maybeSingle();

      if (!nfse) {
        return new Response(JSON.stringify({ error: "NFSe não encontrada" }), {
          status: 404,
        });
      }

      // ✅ buscar cliente
      const { data: cliente } = await supabaseAdmin
        .from("clientes")
        .select("email, nome")
        .eq("id", nfse.cliente_id)
        .maybeSingle();

      if (!cliente?.email) {
        return new Response(
          JSON.stringify({ error: "Email do cliente ausente" }),
          { status: 400 },
        );
      }

      // ✅ extrair dados
      let pdfUrl: string | null = null;
      let xmlUrl: string | null = null;

      const resp = nfse.resposta;

      if (isRecord(resp)) {
        pdfUrl =
          getString(resp["url_danfse"]) ?? getString(resp["url"]) ?? null;

        xmlUrl = getString(resp["caminho_xml_nota_fiscal"]) ?? null;
      }

      const tpl = nfseAuthorizedTemplate({
        nome: cliente.nome ?? "Cliente",
        ref,
        nfsePdfUrl: pdfUrl,
        nfseXmlUrl: xmlUrl,
      });

      subject = tpl.subject;
      html = tpl.html;

      // ✅ sobrescreve destino
      return await sendAndRespond(cliente.email, subject, html);
    }
    default:
      return new Response(JSON.stringify({ error: "tipo não suportado" }), {
        status: 400,
      });
  }

  /* ================= SEND ================= */

  const ok = await sendAndRespond(base.email, subject, html);

  if (!ok) {
    return new Response(JSON.stringify({ error: "Falha ao enviar email" }), {
      status: 502,
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
  });
});
