"use server";

import { createServerSupabase } from "@/lib/supabase/server";

type ClienteRow = {
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

/**
 * Lista clientes + métricas reais via contratos:
 * - contratos_count
 * - ultimo_status_contrato
 * - ultimo_inicio (data_inicio do contrato mais recente)
 */
export async function listarClientesAdmin(): Promise<ClienteRow[]> {
  const supabase = await createServerSupabase();

  // 1) pega clientes base
  const { data: clientes, error: errClientes } = await supabase
    .from("clientes")
    .select("id,tipo,nome,documento,email,telefone,ativo,created_at")
    .order("created_at", { ascending: false });

  if (errClientes) throw new Error(friendlyDbError(errClientes));
  if (!clientes) return [];

  const ids = clientes.map((c) => c.id);

  // 2) puxa contratos relacionados (só o necessário)
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
  for (const id of ids)
    map.set(id, { count: 0, lastStatus: null, lastInicio: null });

  // como contratos está ordenado por criado_em desc, o primeiro que aparecer por cliente é o "último"
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

export async function setClienteAtivo(clienteId: string, ativo: boolean) {
  const supabase = await createServerSupabase();

  const { error } = await supabase
    .from("clientes")
    .update({ ativo })
    .eq("id", clienteId);

  if (error) throw new Error(friendlyDbError(error));
}

export async function deletarCliente(clienteId: string) {
  const supabase = await createServerSupabase();

  const { error } = await supabase
    .from("clientes")
    .delete()
    .eq("id", clienteId);
  if (error) throw new Error(friendlyDbError(error));
}
