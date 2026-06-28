import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getCaller } from "../../importacao-usuarios/_shared/getCaller";

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

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
      .select("id, pending_email")
      .eq("id", userId)
      .maybeSingle();

    if (!usuario)
      return NextResponse.json(
        { ok: false, error: "Usuário não encontrado" },
        { status: 404 },
      );

    const pending = (usuario as any).pending_email ?? null;
    if (!pending)
      return NextResponse.json(
        { ok: false, error: "Nenhum e-mail pendente" },
        { status: 400 },
      );

    const { error } = await supabaseAdmin
      .from("usuarios")
      .update({ email: pending, pending_email: null })
      .eq("id", userId);

    if (error)
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );

    return NextResponse.json({
      ok: true,
      notice: "E-mail confirmado e atualizado.",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
