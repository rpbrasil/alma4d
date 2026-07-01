import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function basicAuthHeader(token: string) {
  const auth = Buffer.from(`${token}:`, "utf8").toString("base64");
  return `Basic ${auth}`;
}

function nowISO() {
  return new Date().toISOString();
}

function normalizeStatus(status: string): string {
  switch (status) {
    case "autorizado":
      return "emitida";
    case "cancelado":
      return "cancelada";
    case "rejeitado":
      return "erro";
    default:
      return status;
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ ref: string }> },
) {
  try {
    const { ref: rawRef } = await params;
    const ref = decodeURIComponent(rawRef || "");
    if (!ref) {
      return NextResponse.json({ error: "ref obrigatório" }, { status: 400 });
    }

    const FOCUS_TOKEN = process.env.FOCUS_NFE_TOKEN!;
    if (!FOCUS_TOKEN) {
      return NextResponse.json(
        { error: "FOCUS_NFE_TOKEN não configurado" },
        { status: 500 },
      );
    }

    const supabase = getSupabaseAdmin();

    const resp = await fetch(
      `https://api.focusnfe.com.br/v2/nfse/${encodeURIComponent(ref)}`,
      {
        method: "GET",
        headers: {
          Authorization: basicAuthHeader(FOCUS_TOKEN),
          Accept: "application/json",
        },
      },
    );

    const data = await resp.json().catch(() => null);

    // Atualiza snapshot local — serializa resposta como string se a coluna for TEXT
    const { error: updateErr } = await supabase
      .from("nfse_emissoes")
      .update({
        resposta:
          data != null && typeof data === "object"
            ? JSON.stringify(data)
            : data,
        status: resp.ok
          ? normalizeStatus(data?.status ?? "processando_autorizacao")
          : "erro",
        ultimo_erro: resp.ok
          ? null
          : (data?.mensagem ?? "Erro ao consultar NFSe"),
        updated_at: nowISO(),
      })
      .eq("ref", ref);

    if (updateErr) {
      console.warn("[nfse/ref] DB update failed:", updateErr.message);
    }

    if (!resp.ok) {
      return NextResponse.json(
        {
          error: data?.mensagem ?? "Erro ao consultar NFSe",
          codigo: data?.codigo,
          detail: data,
        },
        { status: resp.status },
      );
    }

    const AUTO_EMAIL_ENABLED = process.env.NFSE_AUTO_EMAIL_ENABLED === "true";

    if (AUTO_EMAIL_ENABLED && data?.status === "autorizado") {
      // 1) idempotência: já existe envio automático registrado?
      const { data: already } = await supabase
        .from("logs")
        .select("id")
        .eq("event_type", "NFSE_EMAIL_SENT")
        .eq("entity", "nfse")
        .contains("metadata", { ref, tipo: "auto" })
        .limit(1);

      if (!already || already.length === 0) {
        // 2) monta baseUrl sem depender de env
        const proto = req.headers.get("x-forwarded-proto") ?? "https";
        const host =
          req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
        const baseUrl =
          process.env.BASE_URL || (host ? `${proto}://${host}` : "");

        // log do trigger
        await supabase.from("logs").insert({
          source: "api",
          level: "info",
          event_type: "NFSE_EMAIL_AUTO_TRIGGER",
          entity: "nfse",
          message: { action: "trigger_email", ref },
          metadata: {
            ref,
            tipo: "auto",
            at: nowISO(),
          },
        });

        if (baseUrl) {
          // 3) chama seu endpoint interno de envio por e-mail (que já loga sent/error)
          await fetch(
            `${baseUrl}/api/nfse/email/${encodeURIComponent(ref)}/email`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-internal-secret": process.env.INTERNAL_API_SECRET ?? "",
              },
              body: JSON.stringify({ tipo: "auto" }),
            },
          ).catch(async (err) => {
            await supabase.from("logs").insert({
              source: "api",
              level: "error",
              event_type: "NFSE_EMAIL_AUTO_TRIGGER_ERROR",
              entity: "nfse",
              message: { action: "trigger_email", ref },
              metadata: {
                ref,
                tipo: "auto",
                at: nowISO(),
                error: err instanceof Error ? err.message : String(err),
              },
            });
          });
        } else {
          // não derruba: mas registra
          await supabase.from("logs").insert({
            source: "api",
            level: "error",
            event_type: "NFSE_EMAIL_AUTO_TRIGGER_ERROR",
            entity: "nfse",
            message: { action: "trigger_email", ref },
            metadata: {
              ref,
              tipo: "auto",
              at: nowISO(),
              error: "BASE_URL/host ausente para chamada interna",
            },
          });
        }
      }
    }

    return NextResponse.json(data, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
