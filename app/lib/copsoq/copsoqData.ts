// Dados completos do COPSOQ II BR - Versão Curta
// Baseado na referência oficial em BEQVapp-ref

export type ResponseSet =
  | "RS_FREQ_5"
  | "RS_EXTENT_5"
  | "RS_SAT_4"
  | "RS_WORKLIFE_4"
  | "RS_HEALTH_5"
  | "RS_FREQ_5_LAST4W"
  | "RS_EXPOSURE_12M"
  | "RS_MULTI_SOURCE";

export type Question = {
  id: string;
  scale: string;
  text: string;
  responseSet: ResponseSet;
  reverseScored?: boolean;
};

export type ResponseOption = {
  value: string;
  label: string;
  score: number;
};

export type ResponseSetDef = {
  label: string;
  options: ResponseOption[];
};

export type ScaleScoring = {
  scale: string;
  items: string[];
  method: "sum" | "single_item";
  range: [number, number];
};

// Definição de opções de resposta
export const RESPONSE_SETS: Record<ResponseSet, ResponseSetDef> = {
  RS_FREQ_5: {
    label: "Frequência",
    options: [
      { value: "Sempre", label: "Sempre", score: 4 },
      { value: "Frequentemente", label: "Frequentemente", score: 3 },
      { value: "Às vezes", label: "Às vezes", score: 2 },
      { value: "Raramente", label: "Raramente", score: 1 },
      { value: "Nunca", label: "Nunca", score: 0 },
    ],
  },
  RS_EXTENT_5: {
    label: "Grau / Extensão",
    options: [
      { value: "Em grande parte", label: "Em grande parte", score: 4 },
      { value: "Em boa parte", label: "Em boa parte", score: 3 },
      { value: "De certa forma", label: "De certa forma", score: 2 },
      { value: "Pouco", label: "Pouco", score: 1 },
      { value: "Muito pouco", label: "Muito pouco", score: 0 },
    ],
  },
  RS_SAT_4: {
    label: "Satisfação",
    options: [
      { value: "Muito satisfeito", label: "Muito satisfeito", score: 3 },
      { value: "Satisfeito", label: "Satisfeito", score: 2 },
      { value: "Insatisfeito", label: "Insatisfeito", score: 1 },
      { value: "Muito insatisfeito", label: "Muito insatisfeito", score: 0 },
    ],
  },
  RS_WORKLIFE_4: {
    label: "Efeito negativo",
    options: [
      { value: "Sim, com certeza", label: "Sim, com certeza", score: 3 },
      {
        value: "Sim, até certo ponto",
        label: "Sim, até certo ponto",
        score: 2,
      },
      {
        value: "Sim, mas muito pouco",
        label: "Sim, mas muito pouco",
        score: 1,
      },
      { value: "Não, realmente não", label: "Não, realmente não", score: 0 },
    ],
  },
  RS_HEALTH_5: {
    label: "Saúde geral",
    options: [
      { value: "Excelente", label: "Excelente", score: 4 },
      { value: "Muito boa", label: "Muito boa", score: 3 },
      { value: "Boa", label: "Boa", score: 2 },
      { value: "Razoável", label: "Razoável", score: 1 },
      { value: "Ruim", label: "Ruim", score: 0 },
    ],
  },
  RS_FREQ_5_LAST4W: {
    label: "Frequência (últimas 4 semanas)",
    options: [
      { value: "Sempre", label: "Sempre", score: 4 },
      { value: "Frequentemente", label: "Frequentemente", score: 3 },
      { value: "Às vezes", label: "Às vezes", score: 2 },
      { value: "Raramente", label: "Raramente", score: 1 },
      { value: "Nunca", label: "Nunca", score: 0 },
    ],
  },
  RS_EXPOSURE_12M: {
    label: "Exposição (últimos 12 meses)",
    options: [
      { value: "Sim", label: "Sim", score: 1 },
      { value: "Não", label: "Não", score: 0 },
    ],
  },
  RS_MULTI_SOURCE: {
    label: "Fonte de exposição",
    options: [
      { value: "Colegas", label: "Colegas", score: 0 },
      { value: "Gerente, supervisor", label: "Gerente, supervisor", score: 0 },
      { value: "Subordinados", label: "Subordinados", score: 0 },
      {
        value: "Clientes, fregueses, pacientes",
        label: "Clientes, fregueses, pacientes",
        score: 0,
      },
    ],
  },
};

// Questões do COPSOQ II BR
export const COPSOQ_QUESTIONS: Question[] = [
  {
    id: "Q1A",
    scale: "Demandas quantitativas",
    text: "Você atrasa a entrega do seu trabalho?",
    responseSet: "RS_FREQ_5",
  },
  {
    id: "Q1B",
    scale: "Demandas quantitativas",
    text: "O tempo para realizar as suas tarefas no trabalho é suficiente?",
    responseSet: "RS_FREQ_5",
    reverseScored: true,
  },
  {
    id: "Q2A",
    scale: "Ritmo de trabalho",
    text: "É necessário manter um ritmo acelerado no trabalho?",
    responseSet: "RS_FREQ_5",
  },
  {
    id: "Q2B",
    scale: "Ritmo de trabalho",
    text: "Você trabalha em ritmo acelerado ao longo de toda jornada?",
    responseSet: "RS_FREQ_5",
  },
  {
    id: "Q3A",
    scale: "Demandas emocionais",
    text: "Seu trabalho coloca você em situações emocionalmente desgastantes?",
    responseSet: "RS_FREQ_5",
  },
  {
    id: "Q3B",
    scale: "Demandas emocionais",
    text: "Você tem que lidar com os problemas pessoais de outras pessoas como parte do seu trabalho?",
    responseSet: "RS_FREQ_5",
  },
  {
    id: "Q4A",
    scale: "Influência no trabalho",
    text: "Você tem um alto grau de influência nas decisões sobre o seu trabalho?",
    responseSet: "RS_FREQ_5",
  },
  {
    id: "Q4B",
    scale: "Influência no trabalho",
    text: "Você pode interferir na quantidade de trabalho atribuída a você?",
    responseSet: "RS_FREQ_5",
  },
  {
    id: "Q5A",
    scale: "Possibilidades de desenvolvimento",
    text: "Você tem a possibilidade de aprender coisas novas através do seu trabalho?",
    responseSet: "RS_EXTENT_5",
  },
  {
    id: "Q5B",
    scale: "Possibilidades de desenvolvimento",
    text: "Seu trabalho exige que você tome iniciativas?",
    responseSet: "RS_EXTENT_5",
  },
  {
    id: "Q6A",
    scale: "Significado do trabalho",
    text: "Seu trabalho é significativo?",
    responseSet: "RS_EXTENT_5",
  },
  {
    id: "Q6B",
    scale: "Significado do trabalho",
    text: "Você sente que o trabalho que faz é importante?",
    responseSet: "RS_EXTENT_5",
  },
  {
    id: "Q7A",
    scale: "Comprometimento com o local de trabalho",
    text: "Você sente que o seu local de trabalho é muito importante para você?",
    responseSet: "RS_EXTENT_5",
  },
  {
    id: "Q7B",
    scale: "Comprometimento com o local de trabalho",
    text: "Você recomendaria a um amigo que se candidatasse a uma vaga no seu local de trabalho?",
    responseSet: "RS_EXTENT_5",
  },
  {
    id: "Q8A",
    scale: "Previsibilidade / Informação",
    text: "No seu local de trabalho, você é informado antecipadamente sobre decisões importantes, mudanças ou planos para o futuro?",
    responseSet: "RS_EXTENT_5",
  },
  {
    id: "Q8B",
    scale: "Previsibilidade / Informação",
    text: "Você recebe toda a informação necessária para fazer bem o seu trabalho?",
    responseSet: "RS_EXTENT_5",
  },
  {
    id: "Q9A",
    scale: "Reconhecimento / Justiça",
    text: "O seu trabalho é reconhecido e valorizado pelos seus superiores?",
    responseSet: "RS_EXTENT_5",
  },
  {
    id: "Q9B",
    scale: "Reconhecimento / Justiça",
    text: "Você é tratado de forma justa no seu local de trabalho?",
    responseSet: "RS_EXTENT_5",
  },
  {
    id: "Q10A",
    scale: "Clareza de papel",
    text: "O seu trabalho tem objetivos/metas claros(as)?",
    responseSet: "RS_EXTENT_5",
  },
  {
    id: "Q10B",
    scale: "Clareza de papel",
    text: "Você sabe exatamente o que se espera de você no trabalho?",
    responseSet: "RS_EXTENT_5",
  },
  {
    id: "Q11A",
    scale: "Qualidade da liderança",
    text: "Você diria que o seu superior imediato dá alta prioridade para a satisfação com trabalho?",
    responseSet: "RS_EXTENT_5",
  },
  {
    id: "Q11B",
    scale: "Qualidade da liderança",
    text: "Você diria que o seu superior imediato é bom no planejamento do trabalho?",
    responseSet: "RS_EXTENT_5",
  },
  {
    id: "Q12A",
    scale: "Apoio do superior imediato",
    text: "Com que frequência o seu superior imediato está disposto a ouvir os seus problemas no trabalho?",
    responseSet: "RS_FREQ_5",
  },
  {
    id: "Q12B",
    scale: "Apoio do superior imediato",
    text: "Com que frequência você recebe ajuda e suporte do seu superior imediato?",
    responseSet: "RS_FREQ_5",
  },
  {
    id: "Q13",
    scale: "Satisfação no trabalho",
    text: "Qual o seu nível de satisfação com o seu trabalho como um todo, considerando todos os aspectos?",
    responseSet: "RS_SAT_4",
  },
  {
    id: "Q14A",
    scale: "Conflito trabalho-vida",
    text: "Você sente que o seu trabalho consome tanto sua energia que ele tem um efeito negativo na sua vida particular?",
    responseSet: "RS_WORKLIFE_4",
  },
  {
    id: "Q14B",
    scale: "Conflito trabalho-vida",
    text: "Você sente que o seu trabalho ocupa tanto tempo que ele tem um efeito negativo na sua vida particular?",
    responseSet: "RS_WORKLIFE_4",
  },
  {
    id: "Q15A",
    scale: "Confiança na gestão",
    text: "Você pode confiar nas informações que vêm dos seus superiores?",
    responseSet: "RS_EXTENT_5",
  },
  {
    id: "Q15B",
    scale: "Confiança na gestão",
    text: "Os seus superiores confiam que os funcionários farão bem seu trabalho?",
    responseSet: "RS_EXTENT_5",
  },
  {
    id: "Q16A",
    scale: "Justiça organizacional",
    text: "Os conflitos são resolvidos de forma justa?",
    responseSet: "RS_EXTENT_5",
  },
  {
    id: "Q16B",
    scale: "Justiça organizacional",
    text: "O trabalho é distribuído de forma justa?",
    responseSet: "RS_EXTENT_5",
  },
  {
    id: "Q17",
    scale: "Saúde geral",
    text: "Em geral, você diria que a sua saúde é:",
    responseSet: "RS_HEALTH_5",
  },
  {
    id: "Q18A",
    scale: "Esgotamento",
    text: "Com que frequência você tem se sentido fisicamente esgotado?",
    responseSet: "RS_FREQ_5_LAST4W",
  },
  {
    id: "Q18B",
    scale: "Esgotamento",
    text: "Com que frequência você tem se sentido emocionalmente esgotado?",
    responseSet: "RS_FREQ_5_LAST4W",
  },
  {
    id: "Q19A",
    scale: "Estresse",
    text: "Com que frequência você tem se sentido estressado?",
    responseSet: "RS_FREQ_5_LAST4W",
  },
  {
    id: "Q19B",
    scale: "Estresse",
    text: "Com que frequência você tem se sentido irritado?",
    responseSet: "RS_FREQ_5_LAST4W",
  },
];

// Definição de escalas para contabilização
export const SCALE_SCORING: ScaleScoring[] = [
  {
    scale: "Demandas quantitativas",
    items: ["Q1A", "Q1B"],
    method: "sum",
    range: [0, 8],
  },
  {
    scale: "Ritmo de trabalho",
    items: ["Q2A", "Q2B"],
    method: "sum",
    range: [0, 8],
  },
  {
    scale: "Demandas emocionais",
    items: ["Q3A", "Q3B"],
    method: "sum",
    range: [0, 8],
  },
  {
    scale: "Influência no trabalho",
    items: ["Q4A", "Q4B"],
    method: "sum",
    range: [0, 8],
  },
  {
    scale: "Possibilidades de desenvolvimento",
    items: ["Q5A", "Q5B"],
    method: "sum",
    range: [0, 8],
  },
  {
    scale: "Significado do trabalho",
    items: ["Q6A", "Q6B"],
    method: "sum",
    range: [0, 8],
  },
  {
    scale: "Comprometimento com o local de trabalho",
    items: ["Q7A", "Q7B"],
    method: "sum",
    range: [0, 8],
  },
  {
    scale: "Previsibilidade / Informação",
    items: ["Q8A", "Q8B"],
    method: "sum",
    range: [0, 8],
  },
  {
    scale: "Reconhecimento / Justiça",
    items: ["Q9A", "Q9B"],
    method: "sum",
    range: [0, 8],
  },
  {
    scale: "Clareza de papel",
    items: ["Q10A", "Q10B"],
    method: "sum",
    range: [0, 8],
  },
  {
    scale: "Qualidade da liderança",
    items: ["Q11A", "Q11B"],
    method: "sum",
    range: [0, 8],
  },
  {
    scale: "Apoio do superior imediato",
    items: ["Q12A", "Q12B"],
    method: "sum",
    range: [0, 8],
  },
  {
    scale: "Satisfação no trabalho",
    items: ["Q13"],
    method: "single_item",
    range: [0, 3],
  },
  {
    scale: "Conflito trabalho-vida",
    items: ["Q14A", "Q14B"],
    method: "sum",
    range: [0, 6],
  },
  {
    scale: "Confiança na gestão",
    items: ["Q15A", "Q15B"],
    method: "sum",
    range: [0, 8],
  },
  {
    scale: "Justiça organizacional",
    items: ["Q16A", "Q16B"],
    method: "sum",
    range: [0, 8],
  },
  {
    scale: "Saúde geral",
    items: ["Q17"],
    method: "single_item",
    range: [0, 4],
  },
  {
    scale: "Esgotamento",
    items: ["Q18A", "Q18B"],
    method: "sum",
    range: [0, 8],
  },
  { scale: "Estresse", items: ["Q19A", "Q19B"], method: "sum", range: [0, 8] },
];

// Função para calcular pontuação de uma escala
export function calculateScaleScore(
  scaleItems: string[],
  answers: Record<string, string | null>,
  questions: Question[],
): number {
  let total = 0;

  for (const itemId of scaleItems) {
    const answer = answers[itemId];
    if (!answer) continue;

    const question = questions.find((q) => q.id === itemId);
    if (!question) continue;

    const responseSet = RESPONSE_SETS[question.responseSet];
    const option = responseSet.options.find((o) => o.value === answer);
    if (!option) continue;

    let score = option.score;

    // Aplicar reverse scoring se necessário
    if (question.reverseScored) {
      const maxScore = Math.max(...responseSet.options.map((o) => o.score));
      score = maxScore - score;
    }

    total += score;
  }

  return total;
}

// Função para calcular todas as pontuações de escala
export function calculateAllScales(
  answers: Record<string, string | null>,
): Record<string, number> {
  const scores: Record<string, number> = {};

  for (const scaleDef of SCALE_SCORING) {
    scores[scaleDef.scale] = calculateScaleScore(
      scaleDef.items,
      answers,
      COPSOQ_QUESTIONS,
    );
  }

  return scores;
}
