-- migration: create materialized view for daily finance KPIs and refresh function

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_kpi_financeiro_diario AS
WITH unified AS (
  SELECT
    contrato_id,
    cliente_id,
    payment_status,
    valor_cents,
    COALESCE(criado_em, atualizado_em) AS ts
  FROM public.v_financeiro_base
  UNION ALL
  SELECT
    contrato_id,
    cliente_id,
    'paid'::text AS payment_status,
    (ROUND(COALESCE(valor, 0::numeric) * 100::numeric))::bigint AS valor_cents,
    COALESCE(data_pagamento, data_competencia, now()) AS ts
  FROM public.financeiro_lancamentos
)
SELECT
  date_trunc('day', ts)::date AS dia,
  SUM(CASE WHEN lower(payment_status) = 'paid' THEN COALESCE(valor_cents,0) ELSE 0 END) AS receita_paga,
  SUM(CASE WHEN lower(payment_status) = 'pending' THEN COALESCE(valor_cents,0) ELSE 0 END) AS receita_prevista,
  SUM(CASE WHEN lower(payment_status) = 'failed' THEN COALESCE(valor_cents,0) ELSE 0 END) AS receita_perdida,
  SUM(COALESCE(valor_cents,0)) AS receita_total,
  COUNT(*) FILTER (WHERE lower(payment_status) = 'paid') AS pagamentos_count
FROM unified
GROUP BY 1;

CREATE INDEX IF NOT EXISTS idx_mv_kpi_financeiro_diario_dia ON public.mv_kpi_financeiro_diario(dia);

-- expose read-only view used by the dashboard
DROP VIEW IF EXISTS public.v_kpi_financeiro_diario;
CREATE VIEW public.v_kpi_financeiro_diario AS
SELECT * FROM public.mv_kpi_financeiro_diario;

CREATE OR REPLACE FUNCTION public.refresh_mv_kpi_financeiro_diario()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.mv_kpi_financeiro_diario;
END;
$$;

-- End of migration
