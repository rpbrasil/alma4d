import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function normalizeEmail(v: string | null | undefined) {
  return v?.trim().toLowerCase() || null;
}

function normalizePhone(v: string | null | undefined) {
  if (!v) return null;

  const digits = v.replace(/\D/g, "");

  // garante formato +55XXXXXXXXXXX
  if (digits.startsWith("55")) {
    return `+${digits}`;
  }

  return `+55${digits}`;
}

export async function POST() {
  try {
    const authSupabase = await createServerSupabase();
    const admin = getSupabaseAdmin();

    const { data: authData, error: authErr } =
      await authSupabase.auth.getUser();

    if (authErr || !authData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authUser = authData.user;
    const authUserId = authUser.id;

    const email = normalizeEmail(authUser.email);
    const telefone = normalizePhone(authUser.phone);

    // 1) tenta achar um usuario já vinculado por auth_user_id
    const { data: existingIdentity } = await admin
      .from("usuario_auth_identities")
      .select("usuario_id")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    let usuarioId: string | null = existingIdentity?.usuario_id ?? null;

    // 2) se não achou, tenta achar por email/telefone em usuarios
    if (!usuarioId) {
      let usuarioExistente: { id: string } | null = null;

      if (email && telefone) {
        const { data } = await admin
          .from("usuarios")
          .select("id")
          .or(`email.ilike.${email},telefone.eq.${telefone}`)
          .limit(1)
          .maybeSingle();

        usuarioExistente = data;
      } else if (email) {
        const { data } = await admin
          .from("usuarios")
          .select("id")
          .ilike("email", email)
          .limit(1)
          .maybeSingle();

        usuarioExistente = data;
      } else if (telefone) {
        const { data } = await admin
          .from("usuarios")
          .select("id")
          .eq("telefone", telefone)
          .limit(1)
          .maybeSingle();

        usuarioExistente = data;
      }

      usuarioId = usuarioExistente?.id ?? null;
    }

    // 3) se ainda não achou, usa o próprio auth_user_id como usuario_id
    if (!usuarioId) {
      return NextResponse.json(
        {
          error: "Usuário não encontrado para vinculação.",
          detail: {
            email,
            telefone,
          },
        },
        { status: 404 },
      );
    }

    // 4) garante vínculo auth_user_id -> usuario_id
    const { error: identityError } = await admin
      .from("usuario_auth_identities")
      .upsert(
        {
          auth_user_id: authUserId,
          usuario_id: usuarioId,
          email,
          telefone,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "auth_user_id" },
      );

    if (identityError) {
      return NextResponse.json(
        {
          error: "Falha ao vincular identidade.",
          detail: identityError.message,
        },
        { status: 500 },
      );
    }

    // 5) carrega perfil canônico
    const { data: usuario, error: usuarioErr } = await admin
      .from("usuarios")
      .select("id, role, cliente_id, tipo_plano, ativo")
      .eq("id", usuarioId)
      .maybeSingle();

    if (usuarioErr) {
      return NextResponse.json(
        {
          error: "Falha ao carregar usuário canônico.",
          detail: usuarioErr.message,
        },
        { status: 500 },
      );
    }

    if (!usuario) {
      return NextResponse.json(
        { error: "Usuário canônico não encontrado." },
        { status: 404 },
      );
    }

    // ✅ PASSO 1 — LIMPAR TUDO
    const { error: clearErr } = await admin.auth.admin.updateUserById(
      authUserId,
      {
        app_metadata: {}, // limpa completamente
      },
    );

    if (clearErr) {
      return NextResponse.json(
        {
          error: "Falha ao limpar metadata.",
          detail: clearErr.message,
        },
        { status: 500 },
      );
    }

    // ✅ PASSO 2 — GRAVAR FORMATO CORRETO
    // ✅ PASSO 2 — GRAVAR FORMATO CORRETO
    const { error: updateAuthErr } = await admin.auth.admin.updateUserById(
      authUserId,
      {
        app_metadata: {
          user_role: usuario.role,
          user_plano: usuario.tipo_plano,
          user_cliente_id: usuario.cliente_id,
          user_ativo: usuario.ativo,
        },
      },
    );

    if (updateAuthErr) {
      return NextResponse.json(
        {
          error: "Falha ao atualizar claims do usuário auth.",
          detail: updateAuthErr.message,
        },
        { status: 500 },
      );
    }

    // ✅ ✅ ADICIONE ISSO AQUI
    return NextResponse.json({
      success: true,
      auth_user_id: authUserId,
      usuario_id: usuarioId,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Erro interno no bootstrap.",
        detail: err instanceof Error ? err.message : "Erro desconhecido",
      },
      { status: 500 },
    );
  }
}
