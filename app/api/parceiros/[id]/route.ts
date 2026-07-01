import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getCaller } from "../../importacao-usuarios/_shared/getCaller";

// Tipagem para os campos que podem ser atualizados
interface ParceiroUpdate {
  nome?: string;
  documento?: string;
  email?: string;
  telefone?: string;
  aprovado?: boolean;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
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

    // CORREÇÃO ESLINT: Usando a interface em vez de 'any'
    const updates: ParceiroUpdate = {};
    if (body.nome !== undefined) updates.nome = body.nome;
    if (body.documento !== undefined) updates.documento = body.documento;
    if (body.email !== undefined) updates.email = body.email;
    if (body.telefone !== undefined) updates.telefone = body.telefone;
    if (body.aprovado !== undefined) updates.aprovado = body.aprovado;

    const { data, error } = await supabaseAdmin
      .from("parceiros")
      .update(updates)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error)
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );

    return NextResponse.json({ ok: true, parceiro: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = req.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Token ausente" }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    let caller2;
    try {
      caller2 = await getCaller(req, supabaseAdmin);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === "NO_TOKEN" || msg === "INVALID_TOKEN")
        return NextResponse.json({ error: "Token inválido" }, { status: 401 });
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    if (caller2.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from("parceiros")
      .delete()
      .eq("id", id);

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
