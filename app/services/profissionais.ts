// app/services/profissionais.ts
"use server";

import { createServerSupabase } from "@/app/lib/supabase/server";
import type { Profissional, ProfissionalFormData } from "@/types/profissional";

export async function getProfissionalById(id: string): Promise<Profissional> {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from("profissionais")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    throw new Error("Profissional não encontrado");
  }

  return data as Profissional;
}

export async function updateProfissional(
  id: string,
  payload: ProfissionalFormData,
): Promise<void> {
  const supabase = await createServerSupabase();

  const { error } = await supabase
    .from("profissionais")
    .update(payload)
    .eq("id", id);

  if (error) {
    throw new Error("Erro ao atualizar profissional");
  }
}
