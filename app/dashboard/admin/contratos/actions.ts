"use server";

import { createServerSupabase } from "@/lib/supabase/server";

export async function criarContrato(formData: FormData) {
  const supabase = await createServerSupabase();

  const payload = {
    cliente_id: formData.get("cliente_id"),
    numero_contrato: formData.get("numero_contrato"),
    tipo_contrato: formData.get("tipo_contrato"),
    data_inicio: formData.get("data_inicio"),
    data_fim: formData.get("data_fim") || null,
    status: "rascunho",
    limite_usuarios: formData.get("limite_usuarios"),
    limite_gestores: formData.get("limite_gestores"),
    limite_departamentos: formData.get("limite_departamentos"),
    origem_criacao: "manual",
    criado_por: null, // será preenchido pelo RLS / trigger se existir
  };

  const { error } = await supabase.from("contratos").insert(payload);

  if (error) {
    throw new Error("Erro ao criar contrato");
  }
}
