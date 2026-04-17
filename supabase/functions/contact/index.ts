import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders } from "jsr:@supabase/supabase-js/cors";

export const config = {
  auth: false, // ✅ formulário público
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const CONTACT_TO_EMAIL = Deno.env.get("CONTACT_TO_EMAIL") ?? "";

async function sendEmailResend(params: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
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
      reply_to: params.replyTo,
    }),
  });

  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, raw: json };
}

// Sanitização básica
function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

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
    const { nome, email, mensagem } = await req.json();

    if (!nome || !email || !mensagem) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios." }), {
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

    const safeNome = escapeHtml(String(nome));
    const safeEmail = escapeHtml(String(email));
    const safeMsg = escapeHtml(String(mensagem)).replaceAll("\n", "<br/>");

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
            <img src="https://alma4d.com.br/images/alma4d-bicolor-nobground-256.png"
              width="100" alt="alma4D" style="display:block;border:0;" />
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:#333;">
            <h2 style="color:#019499;margin-top:0;">Novo contato pelo site</h2>

            <p><strong>Nome:</strong><br/>${safeNome}</p>
            <p><strong>E‑mail:</strong><br/>
              <a href="mailto:${safeEmail}" style="color:#019499;">${safeEmail}</a>
            </p>

            <p><strong>Mensagem:</strong></p>
            <div style="background:#f4f6f8;padding:16px;border-radius:6px;">
              ${safeMsg}
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:20px;text-align:center;font-size:12px;color:#777;">
            Formulário de contato · alma4D · voss.digital
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
      replyTo: safeEmail, // ✅ responder direto ao usuário
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
        EMAIL DE CONFIRMAÇÃO AO USUÁRIO
       =========================================================== */

    const subjectUser = "Recebemos sua mensagem ✅";

    const htmlUser = `
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:24px 0;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border-radius:8px;font-family:Arial,Helvetica,sans-serif;">
        <tr>
          <td align="center" style="padding:24px;">
            <img src="https://alma4d.com.br/images/alma4d-bicolor-nobground-256.png"
              width="100" alt="alma4D" style="display:block;border:0;" />
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:#333;">
            <h2 style="color:#019499;margin-top:0;">
              Recebemos sua mensagem ✅
            </h2>

            <p>Olá <strong>${safeNome}</strong>,</p>

            <p>
              Obrigado por entrar em contato. Sua mensagem foi recebida com sucesso
              e encaminhada para nossa equipe.
            </p>

            <p>
              Em breve responderemos pelo e‑mail:<br/>
              <strong>${safeEmail}</strong>
            </p>

            <p>
              Caso queira complementar sua mensagem, basta responder este e‑mail.
            </p>

            <p style="margin-top:32px;">
              Atenciosamente,<br/>
              <strong>Equipe alma4D</strong><br/>
              voss.digital
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
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
    return new Response(
      JSON.stringify({
        error: "Erro ao processar requisição.",
        details: String(error),
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
