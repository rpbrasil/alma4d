import { supabaseBrowser as supabase } from "@/lib/supabase/browser";

type Plano = "express" | "premium";
type TipoCupom = "percentual" | "fixo" | "desconto" | "comissao";

export type CupomAplicado = {
  codigo: string;
  tipo: TipoCupom;
  valor: number; // % ou BRL
  descontoBRL: number;
  descontoCents: number;
  totalComDescontoBRL: number;
  totalComDescontoCents: number;
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export async function validarCupom(params: {
  codigo: string;
  totalMensalCents: number;
  plano: Plano;
}): Promise<CupomAplicado> {
  const codigo = params.codigo.trim().toUpperCase();

  if (!codigo) {
    throw new Error("Informe um cupom.");
  }

  const totalBRL = params.totalMensalCents / 100;

  // ✅ busca cupom no banco
  const { data: cupom, error } = await supabase
    .from("cupons")
    .select(
      `
      id,
      codigo,
      tipo,
      valor,
      minimo_valor,
      maximo_desconto,
      limite_total,
      usos_total,
      plano,
      ativo,
      valido_de,
      valido_ate
    `,
    )
    .eq("codigo", codigo)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!cupom) throw new Error("Cupom inválido.");

  // ✅ ativo
  if (!cupom.ativo) {
    throw new Error("Cupom inativo.");
  }

  // ✅ validade
  const now = new Date();

  if (cupom.valido_de && new Date(cupom.valido_de) > now) {
    throw new Error("Cupom ainda não está válido.");
  }

  if (cupom.valido_ate && new Date(cupom.valido_ate) < now) {
    throw new Error("Cupom expirado.");
  }

  // ✅ plano
  if (cupom.plano && cupom.plano !== params.plano) {
    throw new Error("Cupom não aplicável a este plano.");
  }

  // ✅ mínimo
  if (cupom.minimo_valor && totalBRL < Number(cupom.minimo_valor)) {
    throw new Error("Valor mínimo não atingido para usar este cupom.");
  }

  // ✅ limite global
  if (cupom.limite_total !== null && cupom.usos_total >= cupom.limite_total) {
    throw new Error("Cupom esgotado.");
  }

  // ✅ cálculo do desconto
  let descontoBRL = 0;

  if (cupom.tipo === "percentual" || cupom.tipo === "desconto") {
    descontoBRL = totalBRL * (Number(cupom.valor) / 100);
  } else if (cupom.tipo === "fixo") {
    descontoBRL = Number(cupom.valor);
  } else {
    descontoBRL = 0;
  }

  // ✅ teto de desconto (se existir)
  if (cupom.maximo_desconto) {
    descontoBRL = Math.min(descontoBRL, Number(cupom.maximo_desconto));
  }

  descontoBRL = round2(Math.max(0, descontoBRL));

  const totalComDescontoBRL = round2(Math.max(0, totalBRL - descontoBRL));

  return {
    codigo: cupom.codigo,
    tipo: cupom.tipo,
    valor: Number(cupom.valor),

    descontoBRL,
    descontoCents: Math.round(descontoBRL * 100),

    totalComDescontoBRL,
    totalComDescontoCents: Math.round(totalComDescontoBRL * 100),
  };
}
