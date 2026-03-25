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
  // ✅ PRE-FLIGHT CORS (tem que estar no topo) [2](https://supabase.com/docs/guides/functions/cors)
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
      <h2>Novo contato</h2>
      <p><b>Nome:</b> ${safeNome}</p>
      <p><b>Email:</b> ${safeEmail}</p>
      <p><b>Mensagem:</b><br/>${safeMsg}</p>
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
