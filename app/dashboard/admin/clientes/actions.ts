"use server";

import { createServerSupabase } from "@/app/lib/supabase/server";

export async function criarCliente(formData: FormData) {
  const supabase = await createServerSupabase();

  const payload = {
    tipo: formData.get("tipo"),
    nome: formData.get("nome"),
    documento: formData.get("documento"),
    email: formData.get("email"),
    telefone: formData.get("telefone"),
    ativo: true,
    origem_criacao: "manual",
  };

  const { error } = await supabase.from("clientes").insert(payload);

  if (error) {
    throw new Error("Erro ao criar cliente");
  }
}
