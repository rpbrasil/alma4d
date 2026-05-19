type Plano = "express" | "premium";
type TipoCupom = "desconto" | "comissao";

export type CupomAplicado = {
  codigo: string;
  tipo: TipoCupom;

  percentual: number;

  descontoCents: number;
  descontoBRL: number;

  totalComDescontoCents: number;
  totalComDescontoBRL: number;
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function fetchWithTimeout(
  input: RequestInfo,
  init: RequestInit = {},
  ms = 8000,
) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  return fetch(input, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(t),
  );
}

export async function validarCupom(params: {
  codigo: string;
  totalMensalCents: number;
  plano: Plano;
}): Promise<CupomAplicado> {
  const codigo = String(params.codigo ?? "")
    .trim()
    .toUpperCase();
  if (!codigo) throw new Error("Informe um cupom.");

  if (
    !Number.isFinite(params.totalMensalCents) ||
    params.totalMensalCents <= 0
  ) {
    throw new Error("Total inválido para aplicar cupom.");
  }

  const res = await fetchWithTimeout(
    "/api/cupom/validar",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        codigo,
        totalMensalCents: params.totalMensalCents,
        plano: params.plano,
      }),
    },
    8000,
  );

  const json = (await res.json().catch(() => ({}))) as
    | {
        ok?: boolean;
        error?: string;
        codigo?: string;
        tipo?: TipoCupom;
        percentual?: number;
        descontoCents?: number;
        totalComDescontoCents?: number;
      }
    | undefined;

  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || "Erro ao validar cupom.");
  }

  const descontoCents = Number(json.descontoCents ?? 0);
  const totalComDescontoCents = Number(
    json.totalComDescontoCents ?? params.totalMensalCents,
  );

  return {
    codigo: String(json.codigo ?? codigo),
    tipo: (json.tipo ?? "desconto") as TipoCupom,
    percentual: Number(json.percentual ?? 0),

    descontoCents,
    descontoBRL: round2(descontoCents / 100),

    totalComDescontoCents,
    totalComDescontoBRL: round2(totalComDescontoCents / 100),
  };
}
