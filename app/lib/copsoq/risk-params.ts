import { SCALE_SCORING } from "@/lib/copsoq/copsoqData";
// ajuste o caminho real do arquivo onde estão SCALE_SCORING / COPSOQ_QUESTIONS

type Direction = "higher_worse" | "higher_better";

export type CopsoqRiskParamRow = {
  cliente_id: string;
  instrumento: string;
  versao: string;
  escala: string;
  min_score: number;
  max_score: number;
  low_max: number;
  med_max: number;
  direction: Direction;
  ativo: boolean;
};

const INSTRUMENTO = "COPSOQ_II_BR";
const VERSAO = "curta";

// Este mapa é a única parte “semiautomática” que precisa existir,
// porque o arquivo TS do questionário define range e itens,
// mas não define explicitamente a direção do risco.
const DIRECTION_BY_SCALE: Record<string, Direction> = {
  "Demandas quantitativas": "higher_worse",
  "Ritmo de trabalho": "higher_worse",
  "Demandas emocionais": "higher_worse",
  "Influência no trabalho": "higher_better",
  "Possibilidades de desenvolvimento": "higher_better",
  "Significado do trabalho": "higher_better",
  "Comprometimento com o local de trabalho": "higher_better",
  "Previsibilidade / Informação": "higher_better",
  "Reconhecimento / Justiça": "higher_better",
  "Clareza de papel": "higher_better",
  "Qualidade da liderança": "higher_better",
  "Apoio do superior imediato": "higher_better",
  "Satisfação no trabalho": "higher_better",
  "Conflito trabalho-vida": "higher_worse",
  "Confiança na gestão": "higher_better",
  "Justiça organizacional": "higher_better",
  "Saúde geral": "higher_better",
  Esgotamento: "higher_worse",
  Estresse: "higher_worse",
};

function round2(n: number) {
  return Number(n.toFixed(2));
}

export function buildCopsoqRiskParamsForCliente(
  clienteId: string,
): CopsoqRiskParamRow[] {
  return SCALE_SCORING.map((scaleDef) => {
    const [min, max] = scaleDef.range;
    const span = max - min;

    const low_max = round2(min + span / 3);
    const med_max = round2(min + (2 * span) / 3);

    const direction = DIRECTION_BY_SCALE[scaleDef.scale];

    if (!direction) {
      throw new Error(
        `Scale sem direction mapeada: "${scaleDef.scale}". Ajuste DIRECTION_BY_SCALE.`,
      );
    }

    return {
      cliente_id: clienteId,
      instrumento: INSTRUMENTO,
      versao: VERSAO,
      escala: scaleDef.scale,
      min_score: min,
      max_score: max,
      low_max,
      med_max,
      direction,
      ativo: true,
    };
  });
}
