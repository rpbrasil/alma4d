import { createClient } from "@/lib/supabase/client";
import type { Profissional, ProfissionalFormData } from "@/types/profissional";

/**
 * GET - Profissionais ativos
 * Client-side function
 */
export async function getProfissionaisAtivos(): Promise<Profissional[]> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("profissionais")
      .select("*")
      .eq("ativo", true)
      .order("nome", { ascending: true });

    if (error) throw error;
    return data as Profissional[];
  } catch (error) {
    console.error("Erro ao buscar profissionais ativos:", error);
    throw error;
  }
}

/**
 * GET - Todos os profissionais (com filtro de status)
 * Client-side function
 */
export async function getProfissionaisCrud(
  filtroAtivo?: boolean,
): Promise<Profissional[]> {
  try {
    const supabase = createClient();

    let query = supabase.from("profissionais").select("*");

    if (filtroAtivo !== undefined) {
      query = query.eq("ativo", filtroAtivo);
    }

    const { data, error } = await query.order("nome", {
      ascending: true,
    });

    if (error) throw error;
    return (data ?? []) as Profissional[];
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
  data: ProfissionalFormData,
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
        throw new Error("Documento (CPF/CNPJ) já cadastrado");
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

    if (error) {
      if (error.code === "23505") {
        throw new Error("Documento (CPF/CNPJ) já cadastrado");
      }
      throw error;
    }
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
    console.error("Erro ao alternar status do profissional:", error);
    throw error;
  }
}

/**
 * SEARCH - Buscar profissionais por nome ou especialidade
 * Client-side function
 */
export async function searchProfissionais(
  searchTerm: string,
): Promise<Profissional[]> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("profissionais")
      .select("*")
      .or(`nome.ilike.%${searchTerm}%,especialidade.ilike.%${searchTerm}%`)
      .order("nome", { ascending: true });

    if (error) throw error;
    return (data ?? []) as Profissional[];
  } catch (error) {
    console.error("Erro ao buscar profissionais:", error);
    throw error;
  }
}
