// ✅ CLIENT-SIDE ACTIONS (sem "use server")

import { getSupabaseClient } from "@/lib/supabase/client";

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

function asRole(value: string | null | undefined): Role {
  const v = (value || "").trim().toLowerCase();
  if (v === "admin" || v === "cliente" || v === "gestor" || v === "usuario")
    return v;
  return "usuario";
}

// ✅ Supabase client do browser (usa localStorage)
const supabase = getSupabaseClient();

// ✅ Helper: valida sessão e role admin (client)
async function assertAdminClient() {
  const { data: auth, error } = await supabase.auth.getUser();
  if (error || !auth.user) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  const { data: me, error: errMe } = await supabase
    .from("usuarios")
    .select("role")
    .eq("id", auth.user.id)
    .single();

  if (errMe) throw new Error("Erro ao validar permissões.");
  if (asRole(me?.role) !== "admin") {
    throw new Error("Acesso restrito a administradores.");
  }

  return auth.user.id;
}

// =====================================================
// LISTAR USUÁRIOS (ADMIN)
// =====================================================
export async function listarUsuariosAdmin(): Promise<UsuarioRow[]> {
  await assertAdminClient();

  const { data: users, error } = await supabase
    .from("usuarios")
    .select(
      "id,nome_completo,email,telefone,role,ativo,cliente_id,created_at,ultimo_acesso",
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const usuarios = users ?? [];
  const clienteMap = new Map<string, string>();
  // 🔹 buscar nomes dos clientes em lote
  const clienteIds = Array.from(
    new Set(usuarios.map((u) => u.cliente_id).filter(Boolean)),
  ) as string[];

  if (clienteIds.length > 0) {
    const { data: clientes, error: errClientes } = await supabase
      .from("clientes")
      .select("id,nome")
      .in("id", clienteIds);

    if (errClientes) throw new Error(errClientes.message);

    (clientes ?? []).forEach((c) => {
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

// =====================================================
// LISTAR CLIENTES (ADMIN)
// =====================================================
export async function listarClientesParaFiltro() {
  await assertAdminClient();

  const { data, error } = await supabase
    .from("clientes")
    .select("id,nome")
    .order("nome");

  if (error) throw new Error(error.message);
  return data ?? [];
}

// =====================================================
// ATIVAR / DESATIVAR USUÁRIO
// =====================================================
export async function setUsuarioAtivo(usuarioId: string, ativo: boolean) {
  await assertAdminClient();

  const { error } = await supabase
    .from("usuarios")
    .update({ ativo })
    .eq("id", usuarioId);

  if (error) throw new Error(error.message);
}

export async function inativarUsuario(usuarioId: string) {
  await assertAdminClient();

  const { error } = await supabase
    .from("usuarios")
    .update({ ativo: false })
    .eq("id", usuarioId);

  if (error) throw new Error(error.message);
}
