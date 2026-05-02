"use server";

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
  clientes?: { nome: string | null } | null;
};

function asRole(value: string | null | undefined): Role {
  const v = (value || "").trim().toLowerCase();
  if (v === "admin" || v === "cliente" || v === "gestor" || v === "usuario")
    return v;
  // fallback seguro (o banco tem check constraint, mas nunca confie 100%)
  return "usuario";
}

function toUsuarioRow(u: RawUsuario): UsuarioRow {
  return {
    id: u.id,
    nome_completo: u.nome_completo ?? null,
    email: u.email ?? null,
    telefone: u.telefone ?? null,
    role: asRole(u.role),
    ativo: u.ativo ?? true,
    cliente_id: u.cliente_id ?? null,
    cliente_nome: u.clientes?.nome ?? null,
    created_at: u.created_at,
    ultimo_acesso: u.ultimo_acesso ?? null,
  };
}

export async function listarUsuariosAdmin(): Promise<UsuarioRow[]> {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from("usuarios")
    .select(
      `
      id,
      nome_completo,
      email,
      telefone,
      role,
      ativo,
      cliente_id,
      created_at,
      ultimo_acesso,
      clientes ( nome )
    `,
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown[];

  // ✅ sem any: fazemos cast controlado para RawUsuario
  return rows.map((row) => toUsuarioRow(row as RawUsuario));
}

export async function listarClientesParaFiltro(): Promise<ClienteOption[]> {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from("clientes")
    .select("id,nome")
    .order("nome");

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<{ id: string; nome: string }>;
  return rows.map((c) => ({ id: c.id, nome: c.nome }));
}

export async function setUsuarioAtivo(usuarioId: string, ativo: boolean) {
  const supabase = await createServerSupabase();

  const { error } = await supabase
    .from("usuarios")
    .update({ ativo })
    .eq("id", usuarioId);

  if (error) throw new Error(error.message);
}

export async function deletarUsuario(usuarioId: string) {
  const supabase = await createServerSupabase();

  const { error } = await supabase
    .from("usuarios")
    .delete()
    .eq("id", usuarioId);

  if (error) throw new Error(error.message);
}
