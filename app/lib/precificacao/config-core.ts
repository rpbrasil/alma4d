import { createClient } from "@supabase/supabase-js";

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

function num(v: unknown, field: string) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) {
    throw new Error(`Valor inválido em precificacao_config.${field}`);
  }
  return n;
}

export async function getConfigInternal(
  plano = "express",
): Promise<PrecificacaoConfig | null> {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const { data, error } = await supabaseAdmin
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
    .eq("plano", plano)
    .eq("ativo", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;

  return {
    k_base: num(data.k_base, "k_base"),
    decaimento: num(data.decaimento, "decaimento"),
    multiplicador_baixo: num(data.multiplicador_baixo, "multiplicador_baixo"),
    multiplicador_medio: num(data.multiplicador_medio, "multiplicador_medio"),
    multiplicador_alto: num(data.multiplicador_alto, "multiplicador_alto"),
    minimo_usuarios: num(data.minimo_usuarios, "minimo_usuarios"),
    fator_sudeste: num(data.fator_sudeste, "fator_sudeste"),
    fator_sul: num(data.fator_sul, "fator_sul"),
    fator_centro_oeste: num(data.fator_centro_oeste, "fator_centro_oeste"),
    fator_nordeste: num(data.fator_nordeste, "fator_nordeste"),
    fator_norte: num(data.fator_norte, "fator_norte"),
  };
}
