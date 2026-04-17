import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders } from "jsr:@supabase/supabase-js/cors";
// recomendado pela Supabase para CORS no browser [2](https://supabase.com/docs/guides/functions/cors)

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const CONTACT_TO_EMAIL = Deno.env.get("CONTACT_TO_EMAIL") ?? ""; // destino

async function sendEmailResend(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) return { ok: false, reason: "no_resend_key" };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "alma4D <cliente@voss.digital>",
      to,
      subject,
      html,
    }),
  });

  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, raw: json };
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

serve(async (req: Request) => {
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

    const subject = `Contato do site - ${safeNome}`;
    const html = `
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:24px 0;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">

        <!-- Header / Logo -->
        <tr>
          <td align="center" style="padding:24px;background-color:#019499;">
            <img
              src="https://alma4d.com.br/images/alma4d-1024v2.png"
              alt="alma4D"
              width="140"
              style="display:block;border:0;outline:none;text-decoration:none;"
            />
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;color:#333333;">
            <h2 style="margin:0 0 16px 0;font-size:22px;color:#019499;">
              Novo contato pelo site
            </h2>

            <p style="margin:0 0 12px 0;font-size:15px;">
              <strong>Nome:</strong><br/>
              ${safeNome}
            </p>

            <p style="margin:0 0 12px 0;font-size:15px;">
              <strong>E-mail:</strong><br/>
              <a href="mailto:${safeEmail}" style="color:#019499;text-decoration:none;">
                ${safeEmail}
              </a>
            </p>

            <p style="margin:24px 0 8px 0;font-size:15px;">
              <strong>Mensagem:</strong>
            </p>

            <div
              style="
                background-color:#f4f6f8;
                border-radius:6px;
                padding:16px;
                font-size:14px;
                line-height:1.5;
                color:#333333;
              "
            >
              ${safeMsg}
            </div>
          </td>
        </tr>

        <!-- Divider -->
        <tr>
          <td style="padding:0 32px;">
            <hr style="border:none;border-top:1px solid #e0e0e0;" />
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;font-size:12px;color:#777777;text-align:center;">
            Este e-mail foi enviado a partir do formulário de contato do site.<br/>
            <strong>alma4D</strong> · voss.digital
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
`;


    const result = await sendEmailResend(CONTACT_TO_EMAIL, subject, html);

    if (!result.ok) {
      return new Response(
        JSON.stringify({ error: "Falha ao enviar email.", details: result }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Erro ao processar request.",
        details: String(error),
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
