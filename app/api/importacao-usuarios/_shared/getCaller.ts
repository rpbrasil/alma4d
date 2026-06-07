import { SupabaseClient, createClient } from "@supabase/supabase-js";

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
  supabaseAdmin: SupabaseClient,
): Promise<Caller> {
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("NO_TOKEN");
  }

  const token = authHeader.split(" ")[1];

  const { data: userWrap, error: authError } =
    await supabaseAdmin.auth.getUser(token);

  if (authError || !userWrap?.user) {
    throw new Error("INVALID_TOKEN");
  }

  // Create a user-scoped client to call RPC in the caller's context
  const userClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const { data: usuarioRpcData, error: usuarioRpcErr } =
    await userClient.rpc("current_usuario_id");

  if (usuarioRpcErr) {
    throw new Error("INVALID_TOKEN");
  }

  const callerId = normalizeRpcResult(usuarioRpcData);

  if (!callerId) {
    throw new Error("INVALID_TOKEN");
  }

  const { data: caller } = await supabaseAdmin
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
    const { data: cliente } = await supabaseAdmin
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
