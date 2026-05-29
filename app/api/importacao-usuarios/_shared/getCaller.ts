import { SupabaseClient } from "@supabase/supabase-js";

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

  const callerId = userWrap.user.id;

  const { data: caller } = await supabaseAdmin
    .from("usuarios")
    .select("id, role, cliente_id, ativo, tipo_plano")
    .eq("id", callerId)
    .maybeSingle();

  if (!caller || !caller.ativo) {
    throw new Error("NO_PERMISSION");
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