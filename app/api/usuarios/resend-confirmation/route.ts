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
    const type: string = String(body.type ?? "email");

    if (!userId)
      return NextResponse.json(
        { ok: false, error: "user_id obrigatório" },
        { status: 400 },
      );

    const { data: usuario } = await supabaseAdmin
      .from("usuarios")
      .select("id, cliente_id, pending_email, pending_phone")
      .eq("id", userId)
      .maybeSingle();

    if (!usuario)
      return NextResponse.json(
        { ok: false, error: "Usuário não encontrado" },
        { status: 404 },
      );

    // Only allow clients to act within their tenant
    if (
      caller.role === "cliente" &&
      String(usuario.cliente_id) !== String(caller.cliente_id)
    ) {
      return NextResponse.json(
        { ok: false, error: "Acesso negado" },
        { status: 403 },
      );
    }

    // Find auth identity if present
    const { data: identity } = await supabaseAdmin
      .from("usuario_auth_identities")
      .select("auth_user_id")
      .eq("usuario_id", userId)
      .maybeSingle();

    const authUserId = identity?.auth_user_id ?? null;

    if (!authUserId)
      return NextResponse.json(
        { ok: false, error: "Identidade Auth não encontrada" },
        { status: 404 },
      );

    if (type === "email") {
      const pending = (usuario as any).pending_email ?? null;
      if (!pending)
        return NextResponse.json(
          { ok: false, error: "Nenhum e-mail pendente" },
          { status: 400 },
        );

      // Attempt to resend email change confirmation
      const { error: resendErr } = await supabaseAdmin.auth.resend({
        type: "email_change",
        email: pending,
      });
      if (resendErr)
        return NextResponse.json(
          { ok: false, error: resendErr.message },
          { status: 500 },
        );

      return NextResponse.json({
        ok: true,
        notice: "E-mail de confirmação reenviado.",
      });
    }

    if (type === "phone") {
      const pending = (usuario as any).pending_phone ?? null;
      if (!pending)
        return NextResponse.json(
          { ok: false, error: "Nenhum telefone pendente" },
          { status: 400 },
        );

      const { error: resendErr } = await supabaseAdmin.auth.resend({
        type: "phone_change",
        phone: pending,
      });
      if (resendErr)
        return NextResponse.json(
          { ok: false, error: resendErr.message },
          { status: 500 },
        );

      return NextResponse.json({
        ok: true,
        notice: "SMS de confirmação reenviado.",
      });
    }

    return NextResponse.json(
      { ok: false, error: "Tipo inválido" },
      { status: 400 },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
