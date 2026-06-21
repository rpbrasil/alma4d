-- migration: add financeiro view, FKs, indexes and RLS policies

CREATE OR REPLACE VIEW public.v_financeiro_base AS
select
  c.id as contrato_id,
  c.cliente_id,
  c.tipo_contrato,
  c.status as contrato_status,
  c.criado_em,
  c.atualizado_em,
  c.forma_pagamento,
  c.pagarme_order_id,
  lower(COALESCE(c.pagarme_payment_status, ''::text)) as pagarme_status_raw,
  case
    when lower(c.pagarme_payment_status) = any (array['paid'::text, 'succeeded'::text]) then 'paid'::text
    when lower(c.pagarme_payment_status) = any (array['pending'::text, 'waiting_payment'::text]) then 'pending'::text
    when lower(c.pagarme_payment_status) = any (array['failed'::text, 'canceled'::text]) then 'failed'::text
    else 'unknown'::text
  end as payment_status,
  COALESCE(
    round(c.valor_total * 100::numeric),
    round(c.valor_mensal * 100::numeric)
  )::bigint as valor_cents,
  c.cupom_codigo
from
  contratos c
union all
select
  u.id as contrato_id,
  u.cliente_id,
  'upgrade'::text as tipo_contrato,
  'ativo'::text as contrato_status,
  u.created_at as criado_em,
  u.created_at as atualizado_em,
  u.payment_method as forma_pagamento,
  u.pagarme_order_id,
  lower(COALESCE(u.pagarme_payment_status, ''::text)) as pagarme_status_raw,
  case
    when lower(u.pagarme_payment_status) = any (array['paid'::text, 'succeeded'::text]) then 'paid'::text
    when lower(u.pagarme_payment_status) = any (array['pending'::text, 'waiting_payment'::text]) then 'pending'::text
    when lower(u.pagarme_payment_status) = any (array['failed'::text, 'canceled'::text]) then 'failed'::text
    else 'unknown'::text
  end as payment_status,
  u.total_cents as valor_cents,
  null::text as cupom_codigo
from
  contratos_upgrades u;

-- -------------------------
-- RBAC, FKs, índices e RLS
-- -------------------------
ALTER TABLE public.financeiro_lancamentos
  ADD COLUMN IF NOT EXISTS cliente_id uuid,
  ADD COLUMN IF NOT EXISTS contrato_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_financeiro_clientes'
  ) THEN
    ALTER TABLE public.financeiro_lancamentos
      ADD CONSTRAINT fk_financeiro_clientes FOREIGN KEY (cliente_id)
      REFERENCES public.clientes(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_financeiro_contratos'
  ) THEN
    ALTER TABLE public.financeiro_lancamentos
      ADD CONSTRAINT fk_financeiro_contratos FOREIGN KEY (contrato_id)
      REFERENCES public.contratos(id) ON DELETE SET NULL;
  END IF;
END$$;

ALTER TABLE public.financeiro_lancamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS finance_admin_select ON public.financeiro_lancamentos;
CREATE POLICY finance_admin_select ON public.financeiro_lancamentos
  FOR SELECT USING (
    current_setting('jwt.claims.role', true) = 'admin'
  );

DROP POLICY IF EXISTS finance_service_insert ON public.financeiro_lancamentos;
CREATE POLICY finance_service_insert ON public.financeiro_lancamentos
  FOR INSERT WITH CHECK (
    current_setting('jwt.claims.role', true) IN ('service_role', 'admin')
  );

DROP POLICY IF EXISTS finance_service_update ON public.financeiro_lancamentos;
CREATE POLICY finance_service_update ON public.financeiro_lancamentos
  FOR UPDATE
  USING (
    current_setting('jwt.claims.role', true) IN ('service_role', 'admin')
  )
  WITH CHECK (
    current_setting('jwt.claims.role', true) IN ('service_role', 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_financeiro_cliente_id ON public.financeiro_lancamentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_contrato_id ON public.financeiro_lancamentos(contrato_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_created_at ON public.financeiro_lancamentos(created_at);
