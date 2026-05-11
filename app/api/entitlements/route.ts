import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Token ausente" }, { status: 401 });
  }

  const token = auth.split(" ")[1];

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // quem está chamando
  const { data: userWrap, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !userWrap?.user) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  const callerId = userWrap.user.id;

  const { data: perfil, error: perfilErr } = await supabase
    .from("usuarios")
    .select("id, role, cliente_id, ativo")
    .eq("id", callerId)
    .maybeSingle();

  if (perfilErr || !perfil || !perfil.ativo) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  // tenant: se tiver cliente_id, usa ele; se não tiver (trial), usa o próprio user.id como “tenant”
  const tenantId = perfil.cliente_id ?? perfil.id;
  console.log("Tenant ID:", tenantId);
  // limite: se existir contrato ativo para cliente_id, usa limite_usuarios. Se for trial, defina um limite padrão.
  let limite_usuarios: number | null = null;

  if (perfil.cliente_id) {
    const { data: contratoAtivo } = await supabase
      .from("contratos")
      .select("limite_usuarios")
      //.eq("role", "usuario")
      //.eq("ativo", true)
      //.or(`cliente_id.eq.${tenantId},gestor_id.eq.${perfil.id}`)
      .eq("status", "ativo")
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    limite_usuarios = contratoAtivo?.limite_usuarios ?? null;
  } else {
    // trial (ajuste conforme sua regra)
    limite_usuarios = 3;
  }

  // uso atual
  const { count } = await supabase
    .from("usuarios")
    .select("id", { count: "exact", head: true })
    .eq("cliente_id", tenantId)
    .eq("role", "usuario")
    .eq("ativo", true);

  return NextResponse.json({
    limite_usuarios,
    usuarios_ativos: count ?? 0,
  });
}
