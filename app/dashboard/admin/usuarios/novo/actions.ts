"use server";

import { createClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Role } from "../actions";

function onlyDigits(v: string) {
  return (v || "").replace(/\D+/g, "");
}

function isEmail(v: string) {
  const s = (v || "").trim();
  return !!s && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function assertRole(v: string): Role {
  const s = (v || "").trim().toLowerCase();
  if (s === "admin" || s === "cliente" || s === "gestor" || s === "usuario")
    return s;
  return "usuario";
}

type DbLikeError = { message?: string };
function friendlyDbError(err: unknown) {
  const e = (err ?? {}) as DbLikeError;
  const msg = (e.message || "").toLowerCase();

  if (msg.includes("usuarios_email_unique"))
    return "Já existe um usuário com este e-mail.";
  if (msg.includes("usuarios_telefone_unique"))
    return "Já existe um usuário com este telefone.";
  if (msg.includes("usuarios_documento_unique"))
    return "Já existe um usuário com este documento.";
  if (msg.includes("email_no_spaces")) return "E-mail não pode conter espaços.";
  if (msg.includes("usuarios_role_check")) return "Role inválido.";
  if (msg.includes("usuarios_sexo_check")) return "Sexo inválido (use M ou F).";

  return e.message || "Erro ao salvar.";
}

function createAdminClient() {
  const url = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !serviceKey)
    throw new Error("Env ausente: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function assertAdmin() {
  const supa = await createServerSupabase();
  const { data: auth, error: authErr } = await supa.auth.getUser();
  if (authErr) throw new Error(authErr.message);
  if (!auth?.user) throw new Error("Sessão expirada.");

  const { data: me, error } = await supa
    .from("usuarios")
    .select("role")
    .eq("id", auth.user.id)
    .single();
  if (error) throw new Error("Sem permissão para validar role.");
  if ((me?.role || "").toLowerCase() !== "admin")
    throw new Error("Acesso restrito a administradores.");

  return auth.user.id;
}

export async function criarUsuarioAdmin(formData: FormData) {
  await assertAdmin();

  const admin = createAdminClient();

  const cliente_id = String(formData.get("cliente_id") || "").trim();
  const role = assertRole(String(formData.get("role") || "usuario"));
  const nome_completo = String(formData.get("nome_completo") || "").trim();

  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const telefone = onlyDigits(String(formData.get("telefone") || "").trim());
  const documento = onlyDigits(String(formData.get("documento") || "").trim());

  const sexo = String(formData.get("sexo") || "").trim(); // "" | "M" | "F"
  const data_nascimento = String(formData.get("data_nascimento") || "").trim();
  const ativo = String(formData.get("ativo") || "true") === "true";

  const gestor_id = String(formData.get("gestor_id") || "").trim() || null;

  const mode = String(formData.get("mode") || "invite") as
    | "invite"
    | "temporary_password";
  const password = String(formData.get("password") || "").trim();

  if (!cliente_id) throw new Error("Selecione um cliente.");
  if (!nome_completo) throw new Error("Informe o nome completo.");

  const hasEmail = !!email;
  const hasPhone = !!telefone;

  if (!hasEmail && !hasPhone)
    throw new Error("Informe ao menos e-mail ou telefone.");
  if (hasEmail && !isEmail(email)) throw new Error("E-mail inválido.");
  if (hasPhone && !(telefone.length === 10 || telefone.length === 11))
    throw new Error("Telefone inválido (DDD + número).");

  if (mode === "invite" && !hasEmail)
    throw new Error("Para convite por e-mail, informe um e-mail válido.");
  if (mode === "temporary_password" && password.length < 8)
    throw new Error("Senha temporária deve ter pelo menos 8 caracteres.");

  // 1) Criar no Auth (Admin API — service role required) [1](https://www.js-craft.io/blog/error-localstorage-is-not-defined-in-nextjs-how-to-fix-it/)[2](https://www.w3tutorials.net/blog/azure-yaml-deployment-failing-with-error-failed-to-deploy-web-package-to-app-service-conflict-code-409/)
  let authUserId: string | null = null;

  if (mode === "invite") {
    const inviteOptions: { data: Record<string, unknown> } = {
      data: { role, cliente_id, nome_completo },
    };

    const { data, error } = await admin.auth.admin.inviteUserByEmail(
      email,
      inviteOptions,
    );
    if (error) throw new Error(error.message);
    authUserId = data.user?.id ?? null;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: hasEmail ? email : undefined,
      phone: hasPhone ? telefone : undefined,
      password,
      email_confirm: hasEmail ? true : undefined,
      phone_confirm: hasPhone ? true : undefined,
      user_metadata: { role, cliente_id, nome_completo },
    });
    if (error) throw new Error(error.message);
    authUserId = data.user?.id ?? null;
  }

  if (!authUserId)
    throw new Error("Não foi possível obter o ID do usuário criado no Auth.");

  // 2) Upsert em public.usuarios
  const { error: upsertErr } = await admin.from("usuarios").upsert(
    {
      id: authUserId,
      cliente_id,
      role,
      nome_completo,
      email: hasEmail ? email : null,
      telefone: hasPhone ? telefone : null,
      documento: documento || null,
      sexo: sexo === "M" || sexo === "F" ? sexo : null,
      data_nascimento: data_nascimento || null,
      ativo,
    },
    { onConflict: "id" },
  );

  if (upsertErr) throw new Error(friendlyDbError(upsertErr));

  // 3) Upsert em usuario_organizacao
  const { error: orgErr } = await admin.from("usuario_organizacao").upsert(
    {
      usuario_id: authUserId,
      cliente_id,
      gestor_id,
      ativo,
    },
    { onConflict: "usuario_id" },
  );

  if (orgErr) throw new Error(friendlyDbError(orgErr));

  return { id: authUserId };
}
