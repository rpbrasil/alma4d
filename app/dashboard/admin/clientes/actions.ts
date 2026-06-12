// ✅ CLIENT-SIDE ACTIONS (clientes)

import { getSupabaseClient } from "@/lib/supabase/client";

type Role = "admin" | "cliente" | "gestor" | "usuario";

export type ClienteRow = {
  id: string;
  tipo: "pf" | "pj";
  nome: string;
  documento: string | null;
  email: string | null;
  telefone: string | null;
  ativo: boolean;
  created_at: string;
  contratos_count: number;
  ultimo_status_contrato: string | null;
  ultimo_inicio: string | null;
};

type DbLikeError = { message?: string };

function friendlyDbError(err: unknown) {
  const e = (err ?? {}) as DbLikeError;
  return e.message || "Erro ao acessar o banco de dados.";
}

function asRole(value: string | null | undefined): Role {
  const v = (value || "").trim().toLowerCase();
  if (v === "admin" || v === "cliente" || v === "gestor" || v === "usuario")
    return v;
  return "usuario";
}

// ✅ Supabase client do browser (localStorage)
const supabase = getSupabaseClient();

// ✅ Valida sessão + admin no CLIENT
async function assertAdminClient() {
  const { data: auth, error } = await supabase.auth.getUser();

  if (error || !auth.user) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  // ✅ pegar usuario_id canônico
  const { data: usuarioId, error: usuarioIdErr } =
    await supabase.rpc("current_usuario_id");

  if (usuarioIdErr || !usuarioId) {
    throw new Error("Usuário não associado.");
  }

  // ✅ buscar role correta
  const { data: usuario, error: usuarioErr } = await supabase
    .from("usuarios")
    .select("role")
    .eq("id", usuarioId)
    .single();

  if (usuarioErr || !usuario) {
    throw new Error("Erro ao validar permissões.");
  }

  if (asRole(usuario.role) !== "admin") {
    throw new Error("Acesso restrito a administradores.");
  }

  return usuarioId;
}

/**
 * Lista clientes + métricas reais via contratos:
 * - contratos_count
 * - ultimo_status_contrato
 * - ultimo_inicio
 */
export async function listarClientesAdmin(): Promise<ClienteRow[]> {
  await assertAdminClient();

  const { data, error } = await supabase.rpc("get_clientes_admin");

  if (error) throw new Error(friendlyDbError(error));
  return data ?? [];
}

// =====================================================
// ATIVAR / DESATIVAR CLIENTE
// =====================================================
export async function setClienteAtivo(clienteId: string, ativo: boolean) {
  await assertAdminClient();

  const { error } = await supabase
    .from("clientes")
    .update({ ativo })
    .eq("id", clienteId);

  if (error) throw new Error(friendlyDbError(error));
}

// =====================================================
// DELETAR CLIENTE
// =====================================================
export async function deletarCliente(clienteId: string) {
  await assertAdminClient();

  const { error } = await supabase
    .from("clientes")
    .delete()
    .eq("id", clienteId);

  if (error) throw new Error(friendlyDbError(error));
}
