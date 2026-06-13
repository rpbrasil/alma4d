// ✅ tipo do banco (fonte principal)
export type Cupom = {
  id: string;
  codigo: string;
  parceiro_id: string;

  tipo: "desconto" | "comissao";

  percentual: number;
  valor: number;

  ativo: boolean;

  plano: string | null;

  minimo_valor: number | null;
  maximo_desconto: number | null;

  limite_total: number | null;
  usos_total: number;

  valido_de: string | null;
  valido_ate: string | null;

  comissao_percentual: number;

  created_at: string;
};

export type CupomAplicado = {
  codigo: string;
  tipo: "desconto" | "comissao";

  percentual: number;

  descontoCents: number;
  descontoBRL: number;

  totalComDescontoCents: number;
  totalComDescontoBRL: number;
};

export type CupomAutoResponse = {
  ok: boolean;
  hasCoupon: boolean;
  cupom_codigo?: string;
};

export type CupomSelectAuto = {
  codigo: string;
  tipo: "desconto" | "comissao";
  valor: number;
  plano: string | null;
  valido_de: string | null;
  valido_ate: string | null;
  ativo: boolean;
};

export type CupomValidarResponse = {
  ok: boolean;
  codigo?: string;
  tipo?: "desconto" | "comissao";
  percentual?: number;
  descontoCents?: number;
  totalComDescontoCents?: number;
  error?: string;
};

export type CupomUso = {
  id: string;
  cupom_id: string;
  cliente_id: string;
  contrato_id: string;

  valor_desconto: number | null;
  valor_comissao: number | null;

  desconto_percentual: number | null;
  comissao_percentual: number | null;

  cupom_codigo: string | null;
  parceiro_id: string | null;

  created_at: string;
};

export type CupomReserva = {
  id: string;
  cupom_id: string;
  cliente_id: string;
  contrato_id: string;

  cnpj: string;

  status: "reservado" | "consumido" | "cancelado";

  expires_at: string;
  created_at: string;
};