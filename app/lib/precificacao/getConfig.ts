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

export async function getPrecificacaoConfig(): Promise<PrecificacaoConfig | null> {
  if (cachedConfig) return cachedConfig;

  const { data, error, status, statusText } = await supabaseBrowser
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
    .order("id", { ascending: false }) 
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Erro Supabase (detalhado):", {
      status,
      statusText,
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    
    throw new Error(error.message);
  }

  // ✅ se não há config ainda, NÃO derrube a página
  if (!data) return null;

  cachedConfig = data;
  return data;
}
