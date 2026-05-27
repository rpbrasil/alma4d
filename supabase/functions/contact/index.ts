import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders } from "jsr:@supabase/supabase-js/cors";

export const config = {
  auth: false, // ✅ formulário público
};

/* ===================== ENV ===================== */

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const CONTACT_TO_EMAIL = Deno.env.get("CONTACT_TO_EMAIL") ?? "";

/* ===================== HELPERS ===================== */

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* ===================== EMAIL ===================== */

async function sendEmailResend(params: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}) {
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY não configurada");
    return { ok: false, error: "missing_api_key" };
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
      reply_to: params.replyTo,
    }),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error("Erro Resend:", json);
  }

  return { ok: res.ok, raw: json };
}

/* ===================== HANDLER ===================== */

serve(async (req: Request) => {
  // ✅ CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));

    const nome = String(body?.nome ?? "").trim();
    const email = String(body?.email ?? "").trim();
    const mensagem = String(body?.mensagem ?? "").trim();

    /* ===================== VALIDAÇÃO ===================== */

    if (!nome || !email || !mensagem) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({ error: "E-mail inválido." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!CONTACT_TO_EMAIL) {
      return new Response(
        JSON.stringify({ error: "Destino não configurado." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    /* ===================== SANITIZAÇÃO ===================== */

    const safeNome = escapeHtml(nome);
    const safeEmail = escapeHtml(email);
    const safeMsg = escapeHtml(mensagem).replaceAll("\n", "<br/>");

    /* ===========================================================
        EMAIL INTERNO (ADMIN)
       =========================================================== */

    const subjectAdmin = `📩 Novo contato pelo site – ${safeNome}`;

    const htmlAdmin = `
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:24px 0;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border-radius:8px;font-family:Arial,Helvetica,sans-serif;">
        <tr>
          <td align="center" style="padding:24px;">
            <img src="https://alma4d.com.br/images/alma4d-bicolor-nobground-256.webp"
              width="100" alt="alma4D" style="display:block;border:0;" />
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:#333;">
            <h2 style="color:#019499;margin-top:0;">Novo contato pelo site</h2>
            <p><strong>Nome:</strong><br/>${safeNome}</p>
            <p><strong>E-mail:</strong><br/>
              <a href="mailto:${safeEmail}" style="color:#019499;">${safeEmail}</a>
            </p>
            <p><strong>Mensagem:</strong></p>
            <div style="background:#f4f6f8;padding:16px;border-radius:6px;">
              ${safeMsg}
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
`;

    const sentAdmin = await sendEmailResend({
      to: CONTACT_TO_EMAIL,
      subject: subjectAdmin,
      html: htmlAdmin,
      replyTo: safeEmail,
    });

    if (!sentAdmin.ok) {
      return new Response(
        JSON.stringify({ error: "Falha ao enviar e‑mail interno." }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    /* ===========================================================
        EMAIL DE CONFIRMAÇÃO
       =========================================================== */

    const subjectUser = "Recebemos sua mensagem ✅";

    const htmlUser = `
<p>Olá <strong>${safeNome}</strong>,</p>
<p>Recebemos sua mensagem e responderemos em breve.</p>
<p><strong>Equipe alma4D</strong></p>
`;

    await sendEmailResend({
      to: safeEmail,
      subject: subjectUser,
      html: htmlUser,
      replyTo: CONTACT_TO_EMAIL,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro geral contato:", error);

    return new Response(
      JSON.stringify({
        error: "Erro ao processar requisição.",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
