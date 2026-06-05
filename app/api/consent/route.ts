import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

function normalizeRpcResult(u: unknown): string | null {
  if (u == null) return null;
  if (typeof u === "string") return u;
  if (typeof u === "number") return String(u);
  if (Array.isArray(u) && u.length > 0) {
    const first = u[0];
    return (
      (typeof first === "string" && first) ||
      first?.usuario_id ||
      first?.current_usuario_id ||
      null
    );
  }
  if (typeof u === "object") {
    const record = u as Record<string, unknown>;
    return (
      (typeof record.usuario_id === "string" && record.usuario_id) ||
      (typeof record.current_usuario_id === "string" &&
        record.current_usuario_id) ||
      null
    );
  }
  return null;
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Resolve usuario_id canônico
  const { data: usuarioRpcData, error: usuarioRpcErr } =
    await supabase.rpc("current_usuario_id");

  if (usuarioRpcErr) {
    return NextResponse.json(
      { error: "usuario_nao_vinculado" },
      { status: 403 },
    );
  }

  const usuarioId = normalizeRpcResult(usuarioRpcData);

  if (!usuarioId) {
    return NextResponse.json(
      { error: "usuario_nao_vinculado" },
      { status: 403 },
    );
  }

  const body = await req.json();

  const { type, version, action = "accepted", page, metadata = {} } = body;

  const { error } = await supabase.from("logs").insert({
    event_type: "CONSENT",
    source: "api",
    level: "info",
    user_id: usuarioId,
    message: {
      type,
      action,
    },
    metadata: {
      version,
      page,
      user_agent: req.headers.get("user-agent"),
      ...metadata,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
