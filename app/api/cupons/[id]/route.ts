import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
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
    const updates: any = {};
    if (body.codigo !== undefined) updates.codigo = body.codigo;
    if (body.ativo !== undefined) updates.ativo = body.ativo;
    if (body.valor !== undefined) updates.valor = body.valor;
    if (body.tipo !== undefined) updates.tipo = body.tipo;
    if (body.comissao_percentual !== undefined)
      updates.comissao_percentual = body.comissao_percentual;

    const { data, error } = await supabaseAdmin
      .from("cupons")
      .update(updates)
      .eq("id", params.id)
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

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
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

    const { error } = await supabaseAdmin
      .from("cupons")
      .delete()
      .eq("id", params.id);
    if (error)
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
