import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { nfseAuthorizedTemplate } from "../_shared/emailTemplates.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

/* ===================== ENV ===================== */

const resend = Deno.env.get("resend") ?? "";
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
  if (!resend) {
    console.error("resend não configurado");
    return false;
  }

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

  /* ===================== AUTH ===================== */

  const auth = req.headers.get("authorization") ?? "";

  // ⚠️ aceita apenas chamadas com service role
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

  /* ===================== NFSE ===================== */

  const { data: nfse, error: nfseError } = await supabaseAdmin
    .from("nfse_emissoes")
    .select("cliente_id, resposta")
    .eq("ref", ref)
    .maybeSingle();

  if (nfseError) {
    console.error("Erro ao buscar NFSe:", nfseError);
  }

  if (!nfse) {
    return new Response(JSON.stringify({ error: "NFSe não encontrada" }), {
      status: 404,
    });
  }

  /* ===================== CLIENTE ===================== */

  const { data: cliente, error: clienteError } = await supabaseAdmin
    .from("clientes")
    .select("email, nome")
    .eq("id", nfse.cliente_id)
    .maybeSingle();

  if (clienteError) {
    console.error("Erro ao buscar cliente:", clienteError);
  }

  if (!cliente?.email) {
    return new Response(JSON.stringify({ error: "Email do cliente ausente" }), {
      status: 400,
    });
  }

  /* ===================== EXTRAÇÃO ===================== */

  const resp = nfse.resposta;

  let pdfUrl: string | null = null;
  let xmlUrl: string | null = null;

  if (isRecord(resp)) {
    pdfUrl = getString(resp["url_danfse"]) ?? getString(resp["url"]) ?? null;

    xmlUrl = getString(resp["caminho_xml_nota_fiscal"]) ?? null;
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

  /* ===================== SUCCESS ===================== */

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
  });
});
