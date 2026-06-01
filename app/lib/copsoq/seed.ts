import type { SupabaseClient } from "@supabase/supabase-js";
import { buildCopsoqRiskParamsForCliente } from "@/lib/copsoq/risk-params";

export async function seedCopsoqParametrosForCliente(
  supabase: SupabaseClient,
  clienteId: string,
) {
  const rows = buildCopsoqRiskParamsForCliente(clienteId);

  const { error } = await supabase
    .from("copsoq_risco_parametros")
    .upsert(rows, {
      onConflict: "cliente_id,instrumento,versao,escala",
    });

  if (error) {
    throw new Error(
      `Erro ao seedar parâmetros COPSOQ para cliente ${clienteId}: ${error.message}`,
    );
  }

  return rows.length;
}
