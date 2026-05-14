type Risco = "baixo" | "medio" | "alto";

type PrecificacaoConfig = {
  k_base: number;
  decaimento: number;
  multiplicador_baixo: number;
  multiplicador_medio: number;
  multiplicador_alto: number;
  minimo_usuarios: number;
};

export function calcularPrecificacao(
  usuarios: number,
  risco: Risco,
  config: PrecificacaoConfig,
) {
  const n = Math.max(usuarios, config.minimo_usuarios);

  const multiplicadores = {
    baixo: config.multiplicador_baixo,
    medio: config.multiplicador_medio,
    alto: config.multiplicador_alto,
  };

  const fatorRisco = multiplicadores[risco];

  const precoPorUsuarioBRL =
    (config.k_base * fatorRisco) / Math.pow(n, config.decaimento);

  const totalMensalBRL = precoPorUsuarioBRL * n;

  return {
    n,
    risco,
    fatorRisco,
    minimoAplicado: usuarios < config.minimo_usuarios,
    precoPorUsuarioBRL,
    totalMensalBRL,
    precoPorUsuarioCents: Math.round(precoPorUsuarioBRL * 100),
    totalMensalCents: Math.round(totalMensalBRL * 100),
  };
}
