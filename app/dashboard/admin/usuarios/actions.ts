"use server";

import { createClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";

export type Role = "admin" | "cliente" | "gestor" | "usuario";

export type UsuarioRow = {
  id: string;
  nome_completo: string | null;
  email: string | null;
  telefone: string | null;
  role: Role;
  ativo: boolean;
  cliente_id: string | null;
  cliente_nome: string | null;
  created_at: string;
  ultimo_acesso: string | null;
};

type ClienteOption = { id: string; nome: string };

function asRole(value: string | null | undefined): Role {
  const v = (value || "").trim().toLowerCase();
  if (v === "admin" || v === "cliente" || v === "gestor" || v === "usuario")
    return v;
  return "usuario";
}

// Admin DB client (service role) — server-only
function createAdminDbClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Env ausente: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Confirma sessão + role admin (guard)
async function assertAdmin() {
  const supa = await createServerSupabase();
  const { data: auth, error: authErr } = await supa.auth.getUser();
  if (authErr) throw new Error(authErr.message);
  if (!auth?.user) throw new Error("Sessão expirada. Faça login novamente.");

  // valida role do próprio usuário na tabela public.usuarios
  const { data: me, error } = await supa
    .from("usuarios")
    .select("role")
    .eq("id", auth.user.id)
    .single();

  if (error) throw new Error("Sem permissão para validar role do usuário.");
  if (asRole(me?.role) !== "admin")
    throw new Error("Acesso restrito a administradores.");

  return auth.user.id;
}

type RawUsuario = {
  id: string;
  nome_completo: string | null;
  email: string | null;
  telefone: string | null;
  role: string | null;
  ativo: boolean | null;
  cliente_id: string | null;
  created_at: string;
  ultimo_acesso: string | null;
};

export async function listarUsuariosAdmin(): Promise<UsuarioRow[]> {
  await assertAdmin();
  const supabase = await createServerSupabase();

  const { data: users, error: errUsers } = await supabase
    .from("usuarios")
    .select(
      "id,nome_completo,email,telefone,role,ativo,cliente_id,created_at,ultimo_acesso",
    )
    .order("created_at", { ascending: false });

  if (errUsers) throw new Error(errUsers.message);

  const usuarios = (users ?? []) as RawUsuario[];

  // busca nomes dos clientes em lote (sem depender de join)
  const clienteIds = Array.from(
    new Set(usuarios.map((u) => u.cliente_id).filter(Boolean)),
  ) as string[];

  const clienteMap = new Map<string, string>();
  if (clienteIds.length) {
    const { data: cs, error: errC } = await supabase
      .from("clientes")
      .select("id,nome")
      .in("id", clienteIds);

    if (errC) throw new Error(errC.message);

    (cs ?? []).forEach((c: { id: string; nome: string }) => {
      clienteMap.set(c.id, c.nome);
    });
  }

  return usuarios.map((u) => ({
    id: u.id,
    nome_completo: u.nome_completo ?? null,
    email: u.email ?? null,
    telefone: u.telefone ?? null,
    role: asRole(u.role),
    ativo: u.ativo ?? true,
    cliente_id: u.cliente_id ?? null,
    cliente_nome: u.cliente_id ? (clienteMap.get(u.cliente_id) ?? null) : null,
    created_at: u.created_at,
    ultimo_acesso: u.ultimo_acesso ?? null,
  }));
}

export async function listarClientesParaFiltro(): Promise<ClienteOption[]> {
  await assertAdmin();
  const admin = createAdminDbClient();

  const { data, error } = await admin
    .from("clientes")
    .select("id,nome")
    .order("nome");

  if (error) throw new Error(error.message);

  return (data ?? []) as ClienteOption[];
}

export async function setUsuarioAtivo(usuarioId: string, ativo: boolean) {
  await assertAdmin();
  const admin = createAdminDbClient();

  const { error } = await admin
    .from("usuarios")
    .update({ ativo })
    .eq("id", usuarioId);
  if (error) throw new Error(error.message);
}

export async function deletarUsuario(usuarioId: string) {
  await assertAdmin();
  const admin = createAdminDbClient();

  // Remove apenas da tabela public.usuarios.
  // Se quiser deletar também do Auth (auth.users), faça isso no /usuarios/novo/actions.ts via admin.auth.admin.deleteUser().
  const { error } = await admin.from("usuarios").delete().eq("id", usuarioId);
  if (error) throw new Error(error.message);
}
