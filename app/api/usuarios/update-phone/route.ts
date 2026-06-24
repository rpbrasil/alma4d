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
    const telefone: string = String(body.telefone ?? "").trim();

    if (!userId || !telefone)
      return NextResponse.json(
        { ok: false, error: "user_id e telefone obrigatórios" },
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

    // Store as pending_phone until user confirms via Supabase Auth OTP
    const { error } = await supabaseAdmin
      .from("usuarios")
      .update({ pending_phone: telefone })
      .eq("id", userId);

    if (error)
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );

    /*
      Sincroniza o telefone no Supabase Auth quando existir identidade.
      Usamos `phone_confirm: false` intencionalmente — isso NÃO marca o número como
      confirmado (a coluna persistente é `phone_confirmed_at`). O efeito é que o
      usuário precisará confirmar o novo telefone via OTP no próximo login.
    */
    try {
      const { data: identity } = await supabaseAdmin
        .from("usuario_auth_identities")
        .select("auth_user_id")
        .eq("usuario_id", userId)
        .maybeSingle();

      const authUserId = identity?.auth_user_id ?? null;

      if (authUserId) {
        // atualizar apenas o erro (não precisamos do `data` retornado)
        const { error: authErr } =
          await supabaseAdmin.auth.admin.updateUserById(String(authUserId), {
            phone: telefone,
            phone_confirm: false,
          });

        if (authErr)
          return NextResponse.json(
            { ok: false, error: `Auth update failed: ${authErr.message}` },
            { status: 500 },
          );

        // aviso discreto para o cliente informando que confirmação via OTP será necessária
        return NextResponse.json({
          ok: true,
          notice:
            "Telefone pendente; enviamos um SMS de confirmação para o novo número.",
        });
      }
    } catch (e) {
      // surface admin errors
      const msg = e instanceof Error ? e.message : "Erro ao sincronizar Auth";
      return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
