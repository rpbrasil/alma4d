import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    const q = supabaseAdmin
      .from("parceiros_empresas_elegiveis")
      .select("*")
      .order("cnpj");
    const { data, error } = await q;
    if (error)
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );

    return NextResponse.json({ ok: true, empresas: data });
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

    // body can be single object or array
    const rows = Array.isArray(body) ? body : [body];

    // normalize: ensure cnpj digits only, percentual number
    const payload = rows.map((r: any) => ({
      parceiro_id: r.parceiro_id ?? null,
      cnpj: (r.cnpj || "").replace(/\D/g, ""),
      nome: r.nome || null,
      percentual: r.percentual === undefined ? null : Number(r.percentual),
      ativo: r.ativo === undefined ? true : Boolean(r.ativo),
    }));

    // insert in chunks of 200
    const chunkSize = 200;
    let inserted: any[] = [];
    for (let i = 0; i < payload.length; i += chunkSize) {
      const slice = payload.slice(i, i + chunkSize);
      const { data, error } = await supabaseAdmin
        .from("parceiros_empresas_elegiveis")
        .insert(slice)
        .select();
      if (error)
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 500 },
        );
      inserted = inserted.concat(data ?? []);
    }

    return NextResponse.json({ ok: true, inserted });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
