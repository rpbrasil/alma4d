import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getCaller } from "../importacao-usuarios/_shared/getCaller";

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from("parceiros")
      .select("*")
      .order("nome");
    if (error)
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    return NextResponse.json({ ok: true, parceiros: data });
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

    const supabaseAdmin = getSupabaseAdmin();

    let caller;
    try {
      caller = await getCaller(req, supabaseAdmin);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === "NO_TOKEN" || msg === "INVALID_TOKEN")
        return NextResponse.json({ error: "Token inválido" }, { status: 401 });
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    if (caller.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const body = await req.json();
    const payload = {
      nome: body.nome?.trim().toUpperCase() || null,
      documento: body.documento
        ? String(body.documento).replace(/\D/g, "")
        : null,
      email: body.email?.trim() || null,
      telefone: body.telefone || null,
      aprovado: body.aprovado ?? true,
    };
    if (payload.documento) {
      const { data: existing } = await supabaseAdmin
        .from("parceiros")
        .select("id")
        .eq("documento", payload.documento)
        .limit(1);

      if (existing?.length) {
        return NextResponse.json(
          { ok: false, error: "Documento já cadastrado" },
          { status: 400 },
        );
      }
    }

    const { data, error } = await supabaseAdmin
      .from("parceiros")
      .insert([payload]);
    if (error)
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );

    return NextResponse.json({ ok: true, parceiro: data?.[0] ?? null });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
