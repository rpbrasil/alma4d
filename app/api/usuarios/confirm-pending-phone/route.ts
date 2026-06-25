import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCaller } from "../../importacao-usuarios/_shared/getCaller";

export async function POST(req: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    let caller;
    try {
      caller = await getCaller(req, supabaseAdmin);
    } catch {
      return NextResponse.json(
        { ok: false, error: "Acesso negado" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const userId: string = String(body.user_id ?? "").trim();

    if (!userId)
      return NextResponse.json(
        { ok: false, error: "user_id obrigatório" },
        { status: 400 },
      );

    const { data: usuario } = await supabaseAdmin
      .from("usuarios")
      .select("id, cliente_id, pending_phone")
      .eq("id", userId)
      .maybeSingle();

    if (!usuario)
      return NextResponse.json(
        { ok: false, error: "Usuário não encontrado" },
        { status: 400 },
      );

    // Fix #6: sem verificação de tenant qualquer gestor podia confirmar telefone de outro tenant
    if (
      caller.role !== "admin" &&
      String(
        (
          usuario as {
            id: string;
            cliente_id: string;
            pending_phone: string | null;
          }
        ).cliente_id,
      ) !== String(caller.cliente_id)
    ) {
      return NextResponse.json(
        { ok: false, error: "Acesso negado" },
        { status: 403 },
      );
    }

    const pending =
      (
        usuario as {
          id: string;
          cliente_id: string;
          pending_phone: string | null;
        }
      ).pending_phone ?? null;
    if (!pending)
      return NextResponse.json(
        { ok: false, error: "Nenhum telefone pendente" },
        { status: 400 },
      );

    const { error } = await supabaseAdmin
      .from("usuarios")
      .update({ telefone: pending, pending_phone: null })
      .eq("id", userId);

    if (error)
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );

    return NextResponse.json({
      ok: true,
      notice: "Telefone confirmado e atualizado.",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
