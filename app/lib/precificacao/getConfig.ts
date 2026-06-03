import type { PrecificacaoConfig } from "@/lib/precificacao/config-core";

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

export async function getPrecificacaoConfig(
  plano = "express",
): Promise<PrecificacaoConfig | null> {
  if (cachedConfig) return cachedConfig;
  if (pending) return pending;

  pending = (async () => {
    const { controller, clear } = withAbort(8000);

    try {
      const res = await fetch(
        `/api/precificacao/config?plano=${encodeURIComponent(plano)}`,
        {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        },
      );

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(
          j?.error || `Erro ao carregar configuração (HTTP ${res.status})`,
        );
      }

      const j = (await res.json().catch(() => null)) as {
        ok: boolean;
        config: PrecificacaoConfig | null;
      } | null;

      cachedConfig = j?.config ?? null;
      return cachedConfig;
    } finally {
      clear();
      if (!cachedConfig) pending = null;
    }
  })().catch((e) => {
    pending = null;
    throw e;
  });

  return pending;
}
