import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { contratoId, cupom } = body;

    if (!contratoId || !cupom) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Auth: verify JWT (caller may not have a plan yet — lightweight check)
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser(token);

    if (authErr || !user) {
      return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
    }

    // Resolve domain user id
    const { data: identity } = await supabase
      .from("usuario_auth_identities")
      .select("usuario_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    const userId = identity?.usuario_id ?? null;
    if (!userId) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 403 },
      );
    }

    const { data: perfil } = await supabase
      .from("usuarios")
      .select("id, role, cliente_id")
      .eq("id", userId)
      .maybeSingle();

    if (!perfil) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 403 },
      );
    }

    // Fetch contract to validate tenant
    const { data: contrato } = await supabase
      .from("contratos")
      .select("id, cliente_id")
      .eq("id", contratoId)
      .maybeSingle();

    if (!contrato) {
      return NextResponse.json(
        { error: "Contrato não encontrado" },
        { status: 404 },
      );
    }

    const isAdmin = perfil.role === "admin";
    const sameTenant =
      perfil.cliente_id && contrato.cliente_id === perfil.cliente_id;

    if (!isAdmin && !sameTenant) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    // Validate cupom field types before writing to DB
    if (
      typeof cupom.codigo !== "string" ||
      typeof cupom.percentual !== "number" ||
      typeof cupom.descontoCents !== "number" ||
      typeof cupom.totalComDescontoCents !== "number"
    ) {
      return NextResponse.json(
        { error: "Dados do cupom inválidos" },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("contratos")
      .update({
        cupom_codigo: cupom.codigo,
        cupom_percentual: cupom.percentual,
        desconto_cents: cupom.descontoCents,
        total_com_desconto_cents: cupom.totalComDescontoCents,
      })
      .eq("id", contratoId);

    if (error) {
      return NextResponse.json(
        { error: "Erro ao aplicar cupom" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
