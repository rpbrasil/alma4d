import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    const { data, error } = await supabaseAdmin
      .from("cupons")
      .select("*, parceiros(*)")
      .order("codigo");
    if (error)
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    return NextResponse.json({ ok: true, cupons: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Token ausente" }, { status: 401 });
    }

    const token = auth.split(" ")[1];

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    const { data: userWrap, error: authErr } =
      await supabaseAdmin.auth.getUser(token);
    if (authErr || !userWrap?.user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const callerId = userWrap.user.id;
    const { data: perfil, error: perfilErr } = await supabaseAdmin
      .from("usuarios")
      .select("id, role")
      .eq("id", callerId)
      .maybeSingle();

    if (perfilErr || !perfil || perfil.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const body = await req.json();
    const payload: any = {
      codigo: (body.codigo || "").toString().toUpperCase(),
      parceiro_id: body.parceiro_id || null,
      tipo: body.tipo || "desconto",
      valor: body.valor ?? 0,
      ativo: body.ativo ?? true,
      comissao_percentual: body.comissao_percentual ?? null,
      plano: body.plano ?? null,
      valido_de: body.valido_de ?? null,
      valido_ate: body.valido_ate ?? null,
    };

    const { data, error } = await supabaseAdmin
      .from("cupons")
      .insert([payload])
      .select()
      .maybeSingle();
    if (error)
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );

    return NextResponse.json({ ok: true, cupom: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
