"use server";

import { createServerSupabase } from "@/lib/supabase/server";

export async function criarContrato(formData: FormData) {
  const supabase = await createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const clienteId = user?.user_metadata?.cliente_id;

  if (!clienteId) {
    throw new Error("cliente_id não encontrado no usuário");
  }

  const payload = {
    cliente_id: clienteId,

    numero_contrato: formData.get("numero_contrato"),
    tipo_contrato: formData.get("tipo_contrato"),
    data_inicio: formData.get("data_inicio"),
    data_fim: formData.get("data_fim") || null,

    status: "rascunho",

    limite_usuarios: Number(formData.get("limite_usuarios") ?? 0),
    limite_gestores: Number(formData.get("limite_gestores") ?? 0),
    limite_departamentos: Number(formData.get("limite_departamentos") ?? 0),

    origem_criacao: "manual",
    criado_por: user?.id ?? null,
  };

  const { data, error } = await supabase
    .from("contratos")
    .insert(payload)
    .select()
    .single();

  if (!data || error) {
    console.error(error);
    throw new Error("Erro ao criar contrato");
  }

  const contratoId = data.id;

  await supabase.from("contrato_eventos").insert({
    contrato_id: contratoId,
    tipo: "contrato_criado",
    descricao: "Contrato criado manualmente",
    gateway_event_id: null,
  });
}
