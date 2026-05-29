import { SupabaseClient } from "@supabase/supabase-js";

export type ResumoVagas = {
  limite: number;
  elegiveis: number;
  respondidos: number;
  removidos: number;
  restantes: number;
};

export async function getResumoVagasContrato(
  supabase: SupabaseClient,
  contratoId: string,
): Promise<ResumoVagas> {
  const { data: contrato, error: contratoErr } = await supabase
    .from("contratos")
    .select("limite_usuarios")
    .eq("id", contratoId)
    .maybeSingle();

  if (contratoErr || !contrato) {
    throw new Error("Contrato não encontrado.");
  }

  const limite = Number(contrato.limite_usuarios ?? 0);

  const { count: elegiveis } = await supabase
    .from("questionario_vagas")
    .select("id", { count: "exact", head: true })
    .eq("contrato_id", contratoId)
    .eq("status", "elegivel");

  const { count: respondidos } = await supabase
    .from("questionario_vagas")
    .select("id", { count: "exact", head: true })
    .eq("contrato_id", contratoId)
    .eq("status", "respondido");

  const { count: removidos } = await supabase
    .from("questionario_vagas")
    .select("id", { count: "exact", head: true })
    .eq("contrato_id", contratoId)
    .eq("status", "removido");

  const elegiveisCount = elegiveis ?? 0;
  const respondidosCount = respondidos ?? 0;
  const removidosCount = removidos ?? 0;

  const restantes = Math.max(0, limite - elegiveisCount - respondidosCount);

  return {
    limite,
    elegiveis: elegiveisCount,
    respondidos: respondidosCount,
    removidos: removidosCount,
    restantes,
  };
}
