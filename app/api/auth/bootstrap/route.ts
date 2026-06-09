import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { randomUUID } from "crypto";

function normalizeEmail(v: string | null | undefined) {
  return v?.trim().toLowerCase() || null;
}

function normalizePhone(v: string | null | undefined) {
  if (!v) return null;

  const digits = v.replace(/\D/g, "");

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

    // 1️⃣ tentar achar vínculo existente
    const { data: existingIdentity } = await admin
      .from("usuario_auth_identities")
      .select("usuario_id")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    let usuarioId: string | null = existingIdentity?.usuario_id ?? null;

    // 2️⃣ tentar achar usuário por email/telefone
    if (!usuarioId) {
      let query = admin.from("usuarios").select("id").limit(1);

      if (email && telefone) {
        query = query.or(`email.ilike.${email},telefone.eq.${telefone}`);
      } else if (email) {
        query = query.ilike("email", email);
      } else if (telefone) {
        query = query.eq("telefone", telefone);
      }

      const { data: usuarioExistente } = await query.maybeSingle();

      usuarioId = usuarioExistente?.id ?? null;
    }

    // 3️⃣ se não achar → cria usuário pendente
    if (!usuarioId) {
      const { data: novoUsuario, error: createErr } = await admin
        .from("usuarios")
        .insert({
          id: randomUUID(),
          email,
          telefone,
          role: "cliente",
          tipo_plano: "express",
          ativo: false,
          created_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (createErr || !novoUsuario) {
        return NextResponse.json(
          {
            error: "Erro ao criar usuário.",
            detail: createErr?.message,
          },
          { status: 500 },
        );
      }

      usuarioId = novoUsuario.id;
    }

    // 4️⃣ garante vínculo auth → usuario
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

    // 5️⃣ carregar usuário
    const { data: usuario, error: usuarioErr } = await admin
      .from("usuarios")
      .select("id, role, cliente_id, tipo_plano, ativo")
      .eq("id", usuarioId)
      .maybeSingle();

    if (usuarioErr || !usuario) {
      return NextResponse.json(
        {
          error: "Falha ao carregar usuário.",
          detail: usuarioErr?.message,
        },
        { status: 500 },
      );
    }

    // 6️⃣ atualizar metadata no Supabase Auth
    const { error: updateErr } = await admin.auth.admin.updateUserById(
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

    if (updateErr) {
      return NextResponse.json(
        {
          error: "Falha ao atualizar metadata.",
          detail: updateErr.message,
        },
        { status: 500 },
      );
    }

    // ✅ log útil de debug
    console.log("✅ bootstrap ok", {
      authUserId,
      usuarioId,
      email,
      telefone,
    });

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
