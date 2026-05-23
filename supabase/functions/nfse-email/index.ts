import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { nfseAuthorizedTemplate } from "../_shared/emailTemplates.ts";

/* ===================== ENV ===================== */

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

/* ===================== HELPERS ===================== */

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function getString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

/* ===================== EMAIL ===================== */

async function sendEmailResend(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY não configurado");
    return false;
  }

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

  if (!res.ok) {
    console.error("Erro Resend:", json);
  }

  return res.ok;
}

/* ===================== HANDLER ===================== */

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // ✅ segurança
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ") || auth.slice(7) !== SERVICE_ROLE) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  /* ===================== INPUT ===================== */

  const body = await req.json().catch(() => ({}));
  const ref = String(body.ref ?? "");

  if (!ref) {
    return new Response(JSON.stringify({ error: "ref obrigatório" }), {
      status: 400,
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  /* ===================== NFSE ===================== */

  const { data: nfse } = await supabase
    .from("nfse_emissoes")
    .select("cliente_id, resposta")
    .eq("ref", ref)
    .maybeSingle();

  if (!nfse) {
    return new Response(JSON.stringify({ error: "NFSe não encontrada" }), {
      status: 404,
    });
  }

  /* ===================== CLIENTE ===================== */

  const { data: cliente } = await supabase
    .from("clientes")
    .select("email, nome")
    .eq("id", nfse.cliente_id)
    .maybeSingle();

  if (!cliente?.email) {
    return new Response(JSON.stringify({ error: "Email do cliente ausente" }), {
      status: 400,
    });
  }

  /* ===================== EXTRAÇÃO CORRETA (FOCUS REAL) ===================== */

  const resp = nfse.resposta;

  let pdfUrl: string | null = null;
  let xmlUrl: string | null = null;

  if (isRecord(resp)) {
    pdfUrl =
      getString(resp["url_danfse"]) ?? // ✅ principal
      getString(resp["url"]) ??
      null;

    xmlUrl =
      getString(resp["caminho_xml_nota_fiscal"]) ?? // ✅ correto
      null;
  }

  /* ===================== TEMPLATE ===================== */

  const { subject, html } = nfseAuthorizedTemplate({
    nome: cliente.nome ?? "Cliente",
    ref,
    nfsePdfUrl: pdfUrl,
    nfseXmlUrl: xmlUrl,
  });

  /* ===================== ENVIO ===================== */

  const ok = await sendEmailResend(cliente.email, subject, html);

  if (!ok) {
    return new Response(JSON.stringify({ error: "Falha ao enviar email" }), {
      status: 502,
    });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});
