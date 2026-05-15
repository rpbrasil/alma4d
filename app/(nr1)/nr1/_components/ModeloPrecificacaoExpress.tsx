type Risco = "baixo" | "medio" | "alto";

type PrecificacaoConfig = {
  k_base: number;
  decaimento: number;
  multiplicador_baixo: number;
  multiplicador_medio: number;
  multiplicador_alto: number;
  minimo_usuarios: number;

  // ✅ fatores regionais
  fator_sudeste: number;
  fator_sul: number;
  fator_centro_oeste: number;
  fator_nordeste: number;
  fator_norte: number;
};

type Regiao = "sudeste" | "sul" | "centro-oeste" | "nordeste" | "norte";

const UF_TO_REGIAO: Record<string, Regiao> = {
  SP: "sudeste",
  RJ: "sudeste",
  MG: "sudeste",
  ES: "sudeste",
  PR: "sul",
  SC: "sul",
  RS: "sul",
  MT: "centro-oeste",
  MS: "centro-oeste",
  GO: "centro-oeste",
  DF: "centro-oeste",
  BA: "nordeste",
  CE: "nordeste",
  PE: "nordeste",
  RN: "nordeste",
  PB: "nordeste",
  AL: "nordeste",
  SE: "nordeste",
  PI: "nordeste",
  MA: "nordeste",
  AM: "norte",
  PA: "norte",
  AC: "norte",
  RO: "norte",
  RR: "norte",
  AP: "norte",
  TO: "norte",
};

function getRegiaoByUF(uf?: string | null): Regiao {
  const key = String(uf ?? "")
    .trim()
    .toUpperCase();
  return UF_TO_REGIAO[key] ?? "centro-oeste";
}

function getFatorRegiao(config: PrecificacaoConfig, regiao: Regiao) {
  switch (regiao) {
    case "sudeste":
      return config.fator_sudeste;
    case "sul":
      return config.fator_sul;
    case "nordeste":
      return config.fator_nordeste;
    case "norte":
      return config.fator_norte;
    case "centro-oeste":
    default:
      return config.fator_centro_oeste;
  }
}

export function calcularPrecificacao(
  usuarios: number,
  risco: Risco,
  config: PrecificacaoConfig,
  uf?: string | null,
) {
  const n = Math.max(usuarios, config.minimo_usuarios);

  const multiplicadores = {
    baixo: config.multiplicador_baixo,
    medio: config.multiplicador_medio,
    alto: config.multiplicador_alto,
  };

  const fatorRisco = multiplicadores[risco];

  // ✅ NOVO BLOCO (era isso que faltava)
  const regiao = getRegiaoByUF(uf);
  const fatorRegiao = getFatorRegiao(config, regiao);

  const precoPorUsuarioBRL =
    (config.k_base * fatorRisco * fatorRegiao) / Math.pow(n, config.decaimento);

  const totalMensalBRL = precoPorUsuarioBRL * n;

  return {
    n,
    risco,
    regiao,
    fatorRisco,
    fatorRegiao,
    minimoAplicado: usuarios < config.minimo_usuarios,

    precoPorUsuarioBRL,
    totalMensalBRL,

    precoPorUsuarioCents: Math.round(precoPorUsuarioBRL * 100),
    totalMensalCents: Math.round(totalMensalBRL * 100),
  };
}
