import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCaller } from "../../importacao-usuarios/_shared/getCaller";

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization");

    if (!auth?.startsWith("Bearer ")) {
      return NextResponse.json(
        { ok: false, error: "Token ausente" },
        { status: 401 },
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    let caller;
    try {
      caller = await getCaller(req, supabaseAdmin);
      if (!["admin", "cliente", "gestor"].includes(caller.role)) {
        return NextResponse.json(
          { ok: false, error: "Acesso negado" },
          { status: 403 },
        );
      }
    } catch {
      return NextResponse.json(
        { ok: false, error: "Acesso negado" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const userId: string = String(body.user_id ?? "").trim();
    const email: string = String(body.email ?? "").trim();

    if (!userId || !email)
      return NextResponse.json(
        { ok: false, error: "user_id e email obrigatórios" },
        { status: 400 },
      );

    const { data: target } = await supabaseAdmin
      .from("usuarios")
      .select("id, cliente_id")
      .eq("id", userId)
      .maybeSingle();
    if (!target)
      return NextResponse.json(
        { ok: false, error: "Usuário não encontrado" },
        { status: 404 },
      );

    if (
      caller.role === "cliente" &&
      String(target.cliente_id) !== String(caller.cliente_id)
    ) {
      return NextResponse.json(
        { ok: false, error: "Acesso negado" },
        { status: 403 },
      );
    }

    const { error } = await supabaseAdmin
      .from("usuarios")
      .update({ email })
      .eq("id", userId);

    if (error)
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );

    /*
      Quando houver identidade vinculada, sincronizamos o email no Supabase Auth.
      Usamos `email_confirm: false` intencionalmente — NÃO marcamos o e-mail
      como confirmado. A coluna persistente é `email_confirmed_at`, e esse flag
      força que o usuário confirme o novo e-mail (via link/OTP) no próximo fluxo
      de login/ confirmação.
    */
    try {
      const { data: identity } = await supabaseAdmin
        .from("usuario_auth_identities")
        .select("auth_user_id")
        .eq("usuario_id", userId)
        .maybeSingle();

      const authUserId = identity?.auth_user_id ?? null;

      if (authUserId) {
        const { error: authErr } =
          await supabaseAdmin.auth.admin.updateUserById(String(authUserId), {
            email,
            email_confirm: false,
          });

        if (authErr)
          return NextResponse.json(
            { ok: false, error: `Auth update failed: ${authErr.message}` },
            { status: 500 },
          );

        return NextResponse.json({
          ok: true,
          notice: "E-mail atualizado, confirmação necessária pelo usuário.",
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao sincronizar Auth";
      return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
