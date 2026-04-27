import { createClient } from "@/lib/supabase/client";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  ProfissionalCrud,
  Profissional,
  ProfissionalFormData,
} from "@/types/profissional";

/**
 * GET - Profissionais ativos (carrossel/listagem pública)
 * Client-side function
 */
export async function getProfissionaisAtivos(
  clienteId: string,
): Promise<Profissional[]> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("profissionais")
      .select(
        `
        id,
        nome,
        especialidade,
        bio_resumida,
        foto_url,
        calendly_url,
        website_url,
        linkedin_url,
        instagram_url,
        whatsapp_url,
        ativo,
        created_at,
        cliente_id,
        ordem,
        destaque
      `,
      )
      .eq("cliente_id", clienteId)
      .eq("ativo", true)
      .order("destaque", { ascending: false })
      .order("ordem", { ascending: true, nullsFirst: false })
      .order("nome", { ascending: true });

    if (error) throw error;
    return data as Profissional[];
  } catch (error) {
    console.error("Erro ao buscar profissionais ativos:", error);
    throw error;
  }
}

/**
 * GET - Todos os profissionais (CRUD)
 * Client-side function
 */
export async function getProfissionaisCrud(
  clienteId: string,
): Promise<ProfissionalCrud[]> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("profissionais")
      .select("*")
      .eq("cliente_id", clienteId)
      .order("destaque", { ascending: false })
      .order("ordem", { ascending: true, nullsFirst: false })
      .order("nome", { ascending: true });

    if (error) throw error;
    return (data ?? []) as ProfissionalCrud[];
  } catch (error) {
    console.error("Erro ao buscar profissionais CRUD:", error);
    throw error;
  }
}

/**
 * GET - Profissional por ID
 * Client-side function
 */
export async function getProfissionalById(id: string): Promise<Profissional> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("profissionais")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) throw new Error("Profissional não encontrado");

    return data as Profissional;
  } catch (error) {
    console.error("Erro ao buscar profissional:", error);
    throw error;
  }
}

/**
 * POST - Criar novo profissional
 * Client-side function
 */
export async function createProfissional(
  data: ProfissionalFormData & { cliente_id: string },
): Promise<Profissional> {
  try {
    const supabase = createClient();

    const { data: newProf, error } = await supabase
      .from("profissionais")
      .insert([data])
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error("CPF/CNPJ já cadastrado");
      }
      throw error;
    }

    return newProf as Profissional;
  } catch (error) {
    console.error("Erro ao criar profissional:", error);
    throw error;
  }
}

/**
 * PUT - Atualizar profissional
 * Client-side function
 */
export async function updateProfissional(
  id: string,
  updates: Partial<ProfissionalFormData>,
): Promise<Profissional> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("profissionais")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Profissional;
  } catch (error) {
    console.error("Erro ao atualizar profissional:", error);
    throw error;
  }
}

/**
 * DELETE - Deletar profissional (soft delete via ativo = false)
 * Client-side function
 */
export async function deleteProfissional(id: string): Promise<void> {
  try {
    const supabase = createClient();

    const { error } = await supabase
      .from("profissionais")
      .update({ ativo: false })
      .eq("id", id);

    if (error) throw error;
  } catch (error) {
    console.error("Erro ao deletar profissional:", error);
    throw error;
  }
}

/**
 * TOGGLE - Ativar/inativar profissional
 * Client-side function
 */
export async function toggleProfissionalStatus(
  id: string,
  ativo: boolean,
): Promise<Profissional> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("profissionais")
      .update({ ativo })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Profissional;
  } catch (error) {
    console.error("Erro ao alterar status do profissional:", error);
    throw error;
  }
}

/**
 * SEARCH - Buscar profissionais por nome ou especialidade
 * Client-side function
 */
export async function searchProfissionais(
  clienteId: string,
  searchTerm: string,
): Promise<Profissional[]> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("profissionais")
      .select("*")
      .eq("cliente_id", clienteId)
      .or(`nome.ilike.%${searchTerm}%,especialidade.ilike.%${searchTerm}%`)
      .order("nome", { ascending: true });

    if (error) throw error;
    return (data ?? []) as Profissional[];
  } catch (error) {
    console.error("Erro ao buscar profissionais:", error);
    throw error;
  }
}
