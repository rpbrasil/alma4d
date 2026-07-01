import { NextResponse } from "next/server";
import { type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireInternalSecret } from "@/lib/internal_secret";

/** Tipos mínimos (somente o que usamos neste endpoint) */
type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

type Database = {
  public: {
    Tables: {
      logs: {
        Row: {
          id: string;
          created_at: string | null;
          source: string | null;
          level: string | null;
          message: Json | null;
          user_id: string | null;
          metadata: Json | null;
          event_type: string | null;
          entity: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string | null;
          source?: string | null;
          level?: string | null;
          message?: Json | null;
          user_id?: string | null;
          metadata?: Json | null;
          event_type?: string | null;
          entity?: string | null;
        };
        Update: {
          source?: string | null;
          level?: string | null;
          message?: Json | null;
          user_id?: string | null;
          metadata?: Json | null;
          event_type?: string | null;
          entity?: string | null;
        };
        Relationships: [];
      };

      nfse_emissoes: {
        Row: {
          ref: string;
          cliente_id: string | null;
          contrato_id: string | null;
          status: string;
          email_enviado: boolean | null;
        };
        Insert: {
          ref: string;
          cliente_id?: string | null;
          contrato_id?: string | null;
          status?: string;
          email_enviado?: boolean | null;
        };
        Update: {
          cliente_id?: string | null;
          contrato_id?: string | null;
          status?: string;
          email_enviado?: boolean | null;
        };
        Relationships: [];
      };

      clientes: {
        Row: {
          id: string;
          email: string | null;
        };
        Insert: {
          id?: string;
          email?: string | null;
        };
        Update: {
          email?: string | null;
        };
        Relationships: [];
      };
    };

    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

function basicAuthHeader(token: string) {
  return `Basic ${Buffer.from(`${token}:`, "utf8").toString("base64")}`;
}

function nowISO() {
  return new Date().toISOString();
}

async function logEvent(
  supabase: SupabaseClient<Database>,
  payload: {
    event_type: string;
    level: "info" | "error";
    message: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    user_id?: string | null;
    entity?: string | null;
    source?: string | null;
  },
) {
  await supabase.from("logs").insert({
    event_type: payload.event_type,
    source: payload.source ?? "api",
    level: payload.level,
    entity: payload.entity ?? "nfse",
    user_id: payload.user_id ?? null,
    message: payload.message as unknown as Json,
    metadata: {
      at: nowISO(),
      ...(payload.metadata ?? {}),
    } as unknown as Json,
  });
}

type FocusErrorBody = { mensagem?: string; codigo?: string } & Record<
  string,
  unknown
>;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ ref: string }> },
) {
  const { ref: rawRef } = await params;
  const ref = decodeURIComponent(rawRef ?? "");
  if (!ref) {
    return NextResponse.json({ error: "ref obrigatório" }, { status: 400 });
  }

  const deny = requireInternalSecret(req);
  if (deny) return deny;

  const supabase = getSupabaseAdmin() as SupabaseClient<Database>;

  try {
    const body = (await req.json().catch(() => ({}))) as {
      emails?: string[];
      tipo?: "manual" | "auto";
      user_id?: string;
    };

    const tipo = body.tipo ?? "manual";
    const userId = body.user_id ?? null;
    let emails = Array.isArray(body.emails) ? body.emails.filter(Boolean) : [];

    // pega cliente/contrato/status da tabela local
    const { data: nfseLocal } = await supabase
      .from("nfse_emissoes")
      .select("cliente_id, contrato_id, status, email_enviado")
      .eq("ref", ref)
      .maybeSingle();
    if (nfseLocal?.email_enviado === true) {
      return NextResponse.json(
        { ok: true, already_sent: true },
        { status: 200 },
      );
    }

    const clienteId = nfseLocal?.cliente_id ?? null;
    const contratoId = nfseLocal?.contrato_id ?? null;

    // recomendado: só enviar quando autorizado
    if (nfseLocal?.status && nfseLocal.status !== "autorizado") {
      await logEvent(supabase, {
        event_type: "NFSE_EMAIL_ERROR",
        level: "error",
        user_id: userId,
        message: { action: "send_email", ref, tipo },
        metadata: {
          ref,
          tipo,
          action: "send_email",
          reason: "nfse_not_authorized",
          nfse_status: nfseLocal.status,
          cliente_id: clienteId,
          contrato_id: contratoId,
          user_agent: req.headers.get("user-agent"),
        },
      });

      return NextResponse.json(
        { error: "NFSe ainda não está autorizada para envio por e-mail." },
        { status: 400 },
      );
    }

    // fallback: email do cliente
    if (emails.length === 0 && clienteId) {
      const { data: cliente } = await supabase
        .from("clientes")
        .select("email")
        .eq("id", clienteId)
        .maybeSingle();

      if (cliente?.email) emails = [cliente.email];
    }

    if (emails.length === 0) {
      await logEvent(supabase, {
        event_type: "NFSE_EMAIL_ERROR",
        level: "error",
        user_id: userId,
        message: { action: "send_email", ref, tipo },
        metadata: {
          ref,
          tipo,
          action: "send_email",
          reason: "no_emails",
          cliente_id: clienteId,
          contrato_id: contratoId,
          user_agent: req.headers.get("user-agent"),
        },
      });

      return NextResponse.json(
        { error: "Nenhum e-mail disponível para envio." },
        { status: 400 },
      );
    }

    // limite Focus: até 10 emails
    if (emails.length > 10) emails = emails.slice(0, 10);

    await logEvent(supabase, {
      event_type: "NFSE_EMAIL_REQUEST",
      level: "info",
      user_id: userId,
      message: { action: "send_email", ref, tipo },
      metadata: {
        ref,
        tipo,
        action: "send_email",
        emails,
        cliente_id: clienteId,
        contrato_id: contratoId,
        user_agent: req.headers.get("user-agent"),
      },
    });

    const token = process.env.FOCUS_NFE_TOKEN;
    if (!token) {
      await logEvent(supabase, {
        event_type: "NFSE_EMAIL_ERROR",
        level: "error",
        user_id: userId,
        message: { action: "send_email", ref, tipo },
        metadata: {
          ref,
          tipo,
          action: "send_email",
          reason: "missing_token",
          cliente_id: clienteId,
          contrato_id: contratoId,
        },
      });

      return NextResponse.json(
        { error: "FOCUS_NFE_TOKEN não configurado" },
        { status: 500 },
      );
    }

    const resp = await fetch(
      `https://api.focusnfe.com.br/v2/nfse/${encodeURIComponent(ref)}/email`,
      {
        method: "POST",
        headers: {
          Authorization: basicAuthHeader(token),
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ emails }),
      },
    );

    const data = (await resp.json().catch(() => ({}))) as FocusErrorBody;

    if (!resp.ok) {
      await logEvent(supabase, {
        event_type: "NFSE_EMAIL_ERROR",
        level: "error",
        user_id: userId,
        message: { action: "send_email", ref, tipo },
        metadata: {
          ref,
          tipo,
          action: "send_email",
          emails,
          cliente_id: clienteId,
          contrato_id: contratoId,
          focus_status: resp.status,
          focus_response: data,
        },
      });

      return NextResponse.json(
        { error: data.mensagem ?? "Erro ao enviar e-mail", detail: data },
        { status: resp.status },
      );
    }

    await logEvent(supabase, {
      event_type: "NFSE_EMAIL_SENT",
      level: "info",
      user_id: userId,
      message: { action: "send_email", ref, tipo },
      metadata: {
        ref,
        tipo,
        action: "send_email",
        emails,
        cliente_id: clienteId,
        contrato_id: contratoId,
        focus_response: data,
      },
    });
    await supabase
      .from("nfse_emissoes")
      .update({ email_enviado: true })
      .eq("ref", ref);

    return NextResponse.json({ ok: true, emails }, { status: 200 });
  } catch (e: unknown) {
    await logEvent(supabase, {
      event_type: "NFSE_EMAIL_ERROR",
      level: "error",
      message: { action: "send_email", ref, tipo: "manual" },
      metadata: {
        ref,
        tipo: "manual",
        action: "send_email",
        exception: e instanceof Error ? e.message : "unknown_error",
      },
    });

    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro interno" },
      { status: 500 },
    );
  }
}
