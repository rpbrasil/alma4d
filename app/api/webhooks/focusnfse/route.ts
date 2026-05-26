import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

type WebhookLogInsertError = {
  code?: string;
  message?: string;
};

function nowISO() {
  return new Date().toISOString();
}

function getString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function getBaseUrl() {
  return (
    process.env.BASE_URL ??
    process.env.APP_BASE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    null
  );
}

function createSupabaseAdmin(): SupabaseClient {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRole) {
    throw new Error("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes");
  }

  return createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false },
  });
}

export async function POST(req: Request) {
  let supabase: SupabaseClient | null = null;
  let eventHash: string | null = null;

  try {
    /* ===================== SEGURANÇA ===================== */

    const expected = process.env.FOCUS_WEBHOOK_SECRET ?? "";
    const received = req.headers.get("authorization") ?? "";

    if (!expected || received !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* ===================== SUPABASE ===================== */

    supabase = createSupabaseAdmin();

    /* ===================== PAYLOAD RAW + HASH ===================== */

    const raw = await req.text();

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    eventHash = await crypto.subtle
      .digest("SHA-256", new TextEncoder().encode(raw))
      .then((buf) =>
        Array.from(new Uint8Array(buf))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(""),
      );

    /* ===================== DADOS NORMALIZADOS ===================== */

    // Focus costuma mandar:
    // ref = referência da emissão
    // status = autorizado, cancelado, rejeitado etc.
    const ref = getString(payload.ref);
    const status = getString(payload.status)?.toLowerCase() ?? null;

    if (!ref || !status) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    /* ===================== IDEMPOTÊNCIA (webhook_logs) ===================== */

    const { error: insertErr } = await supabase.from("webhook_logs").insert({
      provider: "focusnfse",
      event_type: status,
      order_id: ref,
      contrato_id: null,
      raw_event: payload,
      event_hash: eventHash,
    });

    if (insertErr) {
      const errCode =
        insertErr && typeof insertErr === "object" && "code" in insertErr
          ? String((insertErr as WebhookLogInsertError).code ?? "")
          : "";

      // unique violation = replay/duplicado
      if (errCode === "23505") {
        console.log("Focus webhook duplicado ignorado:", eventHash);
        return NextResponse.json({ ok: true, duplicated: true });
      }

      throw insertErr;
    }

    async function markWebhookLogFinal(params: {
      processado: boolean;
      erro?: string | null;
    }) {
      if (!supabase || !eventHash) return;

      await supabase
        .from("webhook_logs")
        .update({
          processado: params.processado,
          erro: params.erro ?? null,
        })
        .eq("event_hash", eventHash);
    }

    /* ===================== ATUALIZA NFSE ===================== */

    const { data: nfseAtual, error: nfseSelectErr } = await supabase
      .from("nfse_emissoes")
      .select("id, ref, email_enviado")
      .eq("ref", ref)
      .maybeSingle();

    if (nfseSelectErr) {
      await markWebhookLogFinal({
        processado: false,
        erro: nfseSelectErr.message,
      });

      return NextResponse.json(
        { error: `Erro ao localizar NFSe: ${nfseSelectErr.message}` },
        { status: 500 },
      );
    }

    if (!nfseAtual) {
      await markWebhookLogFinal({
        processado: true,
        erro: "NFSe não encontrada para a ref informada",
      });

      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: "NFSe não encontrada",
      });
    }

    const { error: nfseUpdateErr } = await supabase
      .from("nfse_emissoes")
      .update({
        status,
        resposta: payload,
        updated_at: nowISO(),
      })
      .eq("ref", ref);

    if (nfseUpdateErr) {
      await markWebhookLogFinal({
        processado: false,
        erro: nfseUpdateErr.message,
      });

      return NextResponse.json(
        { error: `Erro ao atualizar NFSe: ${nfseUpdateErr.message}` },
        { status: 500 },
      );
    }

    /* ===================== ENVIO DE EMAIL ===================== */

    if (status === "autorizado" && !nfseAtual.email_enviado) {
      try {
        const baseUrl = getBaseUrl();

        if (!baseUrl) {
          throw new Error(
            "BASE_URL / APP_BASE_URL / NEXT_PUBLIC_SITE_URL ausente",
          );
        }

        const res = await fetch(
          `${baseUrl}/api/nfse/email/${encodeURIComponent(ref)}/email`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ tipo: "auto" }),
          },
        );

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(
            `Falha ao chamar endpoint de e-mail NFSe (status ${res.status}): ${text}`,
          );
        }

        const { error: emailFlagErr } = await supabase
          .from("nfse_emissoes")
          .update({
            email_enviado: true,
            updated_at: nowISO(),
          })
          .eq("ref", ref);

        if (emailFlagErr) {
          throw new Error(
            `NFSe autorizada, mas falhou ao marcar email_enviado: ${emailFlagErr.message}`,
          );
        }
      } catch (err) {
        console.error("Erro ao enviar email NFSe:", err);

        await markWebhookLogFinal({
          processado: false,
          erro: String(err),
        });

        return NextResponse.json({
          ok: true,
          email_error: true,
        });
      }
    }

    /* ===================== SUCESSO FINAL ===================== */

    await markWebhookLogFinal({ processado: true });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("Webhook Focus erro:", err);

    if (supabase && eventHash) {
      await supabase
        .from("webhook_logs")
        .update({
          erro: String(err),
          processado: false,
        })
        .eq("event_hash", eventHash);
    }

    return NextResponse.json({ ok: true, internal_error: true });
  }
}
