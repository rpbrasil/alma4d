import { CupomAplicado } from "@/types/cupom";

type Plano = "express" | "premium";

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
  cnpj: string;
}): Promise<CupomAplicado> {
  const codigo = String(params.codigo ?? "")
    .trim()
    .toUpperCase();

  if (!codigo) {
    throw new Error("Informe um cupom.");
  }

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
        cnpj: params.cnpj,
      }),
    },
    8000,
  );

  const json = (await res.json().catch(() => ({}))) as
    | {
        ok?: boolean;
        error?: string;
        codigo?: string;
        tipo?: "desconto" | "comissao";
        percentual?: number;
        descontoCents?: number;
        totalComDescontoCents?: number;
      }
    | undefined;

  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || "Erro ao validar cupom.");
  }

  // ✅ normalização segura
  const descontoCents = Math.max(0, Number(json.descontoCents ?? 0));

  const totalComDescontoCents = Math.max(
    0,
    Number(json.totalComDescontoCents ?? params.totalMensalCents),
  );

  // ✅ garante tipo válido
  const tipo: "desconto" | "comissao" =
    json.tipo === "comissao" ? "comissao" : "desconto";

  const percentual = Number(json.percentual ?? 0);

  return {
    codigo: String(json.codigo ?? codigo),
    tipo,
    percentual,

    descontoCents,
    descontoBRL: round2(descontoCents / 100),

    totalComDescontoCents,
    totalComDescontoBRL: round2(totalComDescontoCents / 100),
  };
}
