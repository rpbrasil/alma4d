-- SQL para adicionar chaves/constraints, índices e políticas RLS
-- Execute no Supabase SQL editor (projeto correto) com privilégios de administrador.

-- 1) adicionar colunas de referência, se inexistentes
ALTER TABLE public.financeiro_lancamentos
  ADD COLUMN IF NOT EXISTS cliente_id uuid,
  ADD COLUMN IF NOT EXISTS contrato_id uuid;

-- 2) criar constraints de FK somente se não existirem
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

-- 3) habilitar Row Level Security (RLS)
ALTER TABLE public.financeiro_lancamentos ENABLE ROW LEVEL SECURITY;

-- 4) políticas: apenas o `admin` (via JWT claim) pode ler; `service_role` e `admin` podem inserir/atualizar
-- Nota: requests feitos com a Service Role Key normalmente ignoram RLS, mas deixamos as policies focadas
-- para chamadas autenticadas via JWT com claim `role = 'admin'`.

-- SELECT: apenas admin
CREATE POLICY finance_admin_select ON public.financeiro_lancamentos
  FOR SELECT USING (
    current_setting('jwt.claims.role', true) = 'admin'
  );

-- INSERT: service_role (quando aplicável) ou admin
CREATE POLICY finance_service_insert ON public.financeiro_lancamentos
  FOR INSERT WITH CHECK (
    current_setting('jwt.claims.role', true) IN ('service_role', 'admin')
  );

-- UPDATE: service_role ou admin
CREATE POLICY finance_service_update ON public.financeiro_lancamentos
  FOR UPDATE
  USING (
    current_setting('jwt.claims.role', true) IN ('service_role', 'admin')
  )
  WITH CHECK (
    current_setting('jwt.claims.role', true) IN ('service_role', 'admin')
  );

-- 5) índices para melhorar consultas do dashboard
CREATE INDEX IF NOT EXISTS idx_financeiro_cliente_id ON public.financeiro_lancamentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_contrato_id ON public.financeiro_lancamentos(contrato_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_created_at ON public.financeiro_lancamentos(created_at);

-- 6) recomendações finais (executar manualmente se desejar):
-- - reveja as policies se for necessário que usuários admin consigam filtrar por `cliente_id`.
-- - considere manter a Service Role Key apenas em ambientes de backend/Edge Functions.
-- - valide os nomes das tabelas `clientes` e `contratos` no seu schema se diferirem.

-- Fim.
