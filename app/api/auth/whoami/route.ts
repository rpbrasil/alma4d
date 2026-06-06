import { NextResponse } from "next/server";
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

export async function GET() {
  try {
    const supabase = await createServerSupabase();

    const { data: authData, error: authErr } = await supabase.auth.getUser();

    if (authErr || !authData.user?.id) {
      return NextResponse.json({ usuario_id: null }, { status: 401 });
    }

    const { data: usuarioRpcData, error: usuarioRpcErr } =
      await supabase.rpc("current_usuario_id");

    if (usuarioRpcErr) {
      return NextResponse.json({ usuario_id: null }, { status: 403 });
    }

    const usuarioId = normalizeRpcResult(usuarioRpcData);

    if (!usuarioId) {
      return NextResponse.json({ usuario_id: null }, { status: 403 });
    }

    const { data: usuario } = await supabase
      .from("usuarios")
      .select("id, nome_completo, role, cliente_id, tipo_plano, ativo")
      .eq("id", usuarioId)
      .maybeSingle();

    console.log("auth user:", authData.user?.id);
    console.log("rpc usuario:", usuarioRpcData);
    console.log("usuario final:", usuario);
    
    return NextResponse.json({
      usuario_id: usuario?.id ?? null,
      nome_completo: usuario?.nome_completo ?? null,
      role: usuario?.role ?? null,
      tipo_plano: usuario?.tipo_plano ?? null,
      cliente_id: usuario?.cliente_id ?? null,
      ativo: usuario?.ativo ?? null,
    });
  } catch (err) {
    console.error("whoami error:", err);
    return NextResponse.json({ usuario_id: null }, { status: 500 });
  }
}
