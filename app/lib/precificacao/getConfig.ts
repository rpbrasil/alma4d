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
let pending: Promise<PrecificacaoConfig | null> | null = null;

export function invalidatePrecificacaoCache() {
  cachedConfig = null;
  pending = null;
}

function withAbort(ms: number) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  return { controller, clear: () => clearTimeout(t) };
}

export async function getPrecificacaoConfig(): Promise<PrecificacaoConfig | null> {
  if (cachedConfig) return cachedConfig;
  if (pending) return pending;

  pending = (async () => {
    const { controller, clear } = withAbort(8000);

    try {
      const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
      const res = await fetch(
        `${baseUrl}/api/precificacao/config?plano=express`,
        {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        },
      );

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Erro ao carregar configuração de preço");
      }

      const j = (await res.json().catch(() => null)) as {
        ok: boolean;
        config: PrecificacaoConfig | null;
      } | null;

      cachedConfig = j?.config ?? null;
      return cachedConfig;
    } finally {
      clear();
      // se não tiver cachedConfig, libera pending pra permitir retry
      if (!cachedConfig) pending = null;
    }
  })().catch((e) => {
    pending = null;
    throw e;
  });

  return pending;
}
