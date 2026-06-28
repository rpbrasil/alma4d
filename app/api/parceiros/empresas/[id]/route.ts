import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getCaller } from "../../../importacao-usuarios/_shared/getCaller";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
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
    const updates: {
      parceiro_id?: string;
      cnpj?: string;
      percentual?: number;
      razao_social?: string | null;
      ativo?: boolean;
    } = {};
    if (body.parceiro_id !== undefined) updates.parceiro_id = body.parceiro_id;
    if (body.cnpj !== undefined)
      updates.cnpj = (body.cnpj || "").replace(/\D/g, "");
    if (body.percentual !== undefined)
      updates.percentual = Number(body.percentual);
    if (body.razao_social !== undefined)
      updates.razao_social = body.razao_social;
    if (body.ativo !== undefined) updates.ativo = body.ativo;

    const { data, error } = await supabaseAdmin
      .from("parceiros_empresas_elegiveis")
      .update(updates)
      .eq("id", params.id)
      .select()
      .maybeSingle();

    if (error)
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );

    return NextResponse.json({ ok: true, empresa: data });
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
      .from("parceiros_empresas_elegiveis")
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
