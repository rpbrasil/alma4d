import { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

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

type Caller = {
  id: string;
  role: string;
  cliente_id: string;
  ativo: boolean;
  tipo_plano: string | null;
};

export async function getCaller(
  req: Request,
  supabase: SupabaseClient,
): Promise<Caller> {
  // ✅ pega usuário do cookie (SUPABASE SSR)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("NO_TOKEN");
  }

  // ✅ RPC no contexto do usuário
  const { data: usuarioRpcData, error: usuarioRpcErr } =
    await supabase.rpc("current_usuario_id");

  if (usuarioRpcErr) {
    throw new Error("INVALID_TOKEN");
  }

  const callerId = normalizeRpcResult(usuarioRpcData);

  if (!callerId) {
    throw new Error("INVALID_TOKEN");
  }

  // ✅ usa admin para buscar dados
  const admin = getSupabaseAdmin();

  const { data: caller } = await admin
    .from("usuarios")
    .select("id, role, cliente_id, ativo, tipo_plano")
    .eq("id", callerId)
    .maybeSingle();

  if (!caller) {
    throw new Error("NO_USER");
  }

  const plano = String(caller.tipo_plano ?? "");

  if (caller.role !== "admin" && !["express", "premium"].includes(plano)) {
    throw new Error("INVALID_PLAN");
  }

  if (caller.role !== "admin") {
    const { data: cliente } = await admin
      .from("clientes")
      .select("ativo")
      .eq("id", caller.cliente_id)
      .maybeSingle();

    if (!cliente?.ativo) {
      throw new Error("CLIENT_INACTIVE");
    }
  }

  return caller as Caller;
}
