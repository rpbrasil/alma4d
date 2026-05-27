import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Token ausente" }, { status: 401 });
  }

  const token = auth.split(" ")[1];

  const supabase = getSupabaseAdmin();

  // quem está chamando
  const { data: userWrap, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !userWrap?.user) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  const callerId = userWrap.user.id;

 const { data: perfil, error: perfilErr } = await supabase
   .from("usuarios")
   .select("id, role, cliente_id, ativo, tipo_plano")
   .eq("id", callerId)
   .maybeSingle();

 if (perfilErr || !perfil || !perfil.ativo || perfil.tipo_plano !== "express") {
   return NextResponse.json({ error: "Plano inválido" }, { status: 403 });
 }

 // ⚠️ IMPORTANTE: express é fluxo pago → precisa ter cliente
 if (!perfil.cliente_id) {
   return NextResponse.json(
     { error: "Sem cliente vinculado" },
     { status: 403 },
   );
 }

 // ✅ valida cliente ativo
 const { data: cliente } = await supabase
   .from("clientes")
   .select("ativo")
   .eq("id", perfil.cliente_id)
   .single();

 if (!cliente?.ativo) {
   return NextResponse.json({ error: "Cliente inativo" }, { status: 403 });
 }

 // ✅ tenant correto (agora sempre cliente_id)
 const tenantId = perfil.cliente_id;

 // ✅ limite baseado no contrato ativo
 let limite_usuarios: number | null = null;

 const { data: contratoAtivo } = await supabase
   .from("contratos")
   .select("limite_usuarios")
   .eq("cliente_id", tenantId)
   .eq("status", "ativo")
   .order("criado_em", { ascending: false })
   .limit(1)
   .maybeSingle();

 limite_usuarios = contratoAtivo?.limite_usuarios ?? null;

 // ✅ uso atual
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
