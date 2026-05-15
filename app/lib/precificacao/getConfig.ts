import { supabaseBrowser } from "../supabase/browser";

export type PrecificacaoConfig = {
  k_base: number;
  decaimento: number;
  multiplicador_baixo: number;
  multiplicador_medio: number;
  multiplicador_alto: number;
  minimo_usuarios: number;
  fator_sudeste: number;
  fator_sul: number;
  fator_centro_oeste: number;
  fator_nordeste: number;
  fator_norte: number;
};

let cachedConfig: PrecificacaoConfig | null = null;
export async function getPrecificacaoConfig() {
  if (cachedConfig) return cachedConfig;

  const { data, error } = await supabaseBrowser
    .from("precificacao_config")
    .select(
      `
      k_base,
      decaimento,
      multiplicador_baixo,
      multiplicador_medio,
      multiplicador_alto,
      minimo_usuarios,
      fator_sudeste,
      fator_sul,
    fator_centro_oeste,
    fator_nordeste,
    fator_norte

    `,
    )
    .eq("plano", "express")
    .eq("ativo", true)
    .single();

  if (error || !data) {
    throw new Error("Erro ao carregar configuração de preço");
  }

  cachedConfig = data;
  return data;
}
