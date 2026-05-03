// ✅ CLIENT-SIDE ACTIONS (clientes)

import { createClient } from "@supabase/supabase-js";

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
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// ✅ Valida sessão + admin no CLIENT
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

/**
 * Lista clientes + métricas reais via contratos:
 * - contratos_count
 * - ultimo_status_contrato
 * - ultimo_inicio
 */
export async function listarClientesAdmin(): Promise<ClienteRow[]> {
  await assertAdminClient();

  // 1️⃣ Clientes base
  const { data: clientes, error: errClientes } = await supabase
    .from("clientes")
    .select("id,tipo,nome,documento,email,telefone,ativo,created_at")
    .order("created_at", { ascending: false });

  if (errClientes) throw new Error(friendlyDbError(errClientes));
  if (!clientes) return [];

  const ids = clientes.map((c) => c.id);

  // 2️⃣ Contratos relacionados
  const { data: contratos, error: errContratos } = await supabase
    .from("contratos")
    .select("cliente_id,status,data_inicio,criado_em")
    .in("cliente_id", ids)
    .order("criado_em", { ascending: false });

  if (errContratos) throw new Error(friendlyDbError(errContratos));

  const map = new Map<
    string,
    { count: number; lastStatus: string | null; lastInicio: string | null }
  >();

  for (const id of ids) {
    map.set(id, { count: 0, lastStatus: null, lastInicio: null });
  }

  if (contratos) {
    for (const ct of contratos) {
      const cur = map.get(ct.cliente_id);
      if (!cur) continue;
      cur.count += 1;
      if (!cur.lastStatus) {
        cur.lastStatus = ct.status ?? null;
        cur.lastInicio = ct.data_inicio ?? null;
      }
    }
  }

  return clientes.map((c) => {
    const meta = map.get(c.id) || {
      count: 0,
      lastStatus: null,
      lastInicio: null,
    };

    return {
      id: c.id,
      tipo: c.tipo,
      nome: c.nome,
      documento: c.documento,
      email: c.email,
      telefone: c.telefone,
      ativo: c.ativo ?? true,
      created_at: c.created_at,
      contratos_count: meta.count,
      ultimo_status_contrato: meta.lastStatus,
      ultimo_inicio: meta.lastInicio,
    };
  });
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
