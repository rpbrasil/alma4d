# README - Integração & Estrutura do Projeto

Resumo: Este arquivo consolida a documentação de estrutura, serviços, hooks, componentes e guias de implementação (Área do Cliente). Use-o como ponto único de verdade para desenvolver novas integrações e alterar a arquitetura de frontend/backend.

Visão rápida

- Local: `app/` contém rotas do Next.js (App Router). Use `services/`, `hooks/`, `components/` e `lib/` para separar responsabilidades.
- Padrões: Auth via Supabase, server-side RPC para mapear `auth_user_id -> usuario_id`, admin client (`getSupabaseAdmin()`) para operações com service role.

Estrutura recomendada (resumo)

- `app/` — rotas e layouts (public, dashboard, cliente, contratos)
- `components/` — UI (shared, public, dashboard)
- `services/` — lógica de acesso a APIs (shared, public, dashboard)
- `hooks/` — hooks React reutilizáveis (`useAuth`, `useProfissionais`, `usePwaInstall`)
- `lib/` — utilitários (supabase clients, storage helpers, pdf helpers)
- `types/` — tipos e interfaces

Padrões e convenções importantes

- Não confiar em query params para autorização — sempre validar ownership server-side.
- Identity-first: trate `auth_user_id` como raiz e mantenha `usuario_auth_identities` sincronizado.
- Idempotência: registre webhooks em `webhook_logs` e use `contrato_eventos` para audit trail.
- Processos assíncronos: geração de PDF e tarefas pesadas via worker/cron.

Quickstart para desenvolvedores

1. Instale dependências: `npm install`
2. Configure `.env.local` com `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `INTERNAL_API_SECRET` (somente em ambientes de teste locais).
3. Rode: `npm run dev`

Onde encontrar o código relevante (mapa rápido)

- Autenticação & usuário: `lib/supabase/*`, `context/auth.tsx`
- NFSe endpoints: `app/api/nfse/*` (emitir, by-cliente, file)
- Worker webhooks: `supabase/functions/webhook-worker/index.ts`
- PDF generation: `app/api/contratos/pdf` (ver `lib/pdf`)

Guia para alterações e pull requests

- Escreva testes unitários para ferramentas críticas (normalização de paths, geração de URLs assinadas).
- Execute `npm run lint` e `npm run build` antes de abrir PR.
- Documente efeitos colaterais (e.g., jobs agendados, cron) e mudanças de schema em migrations.

Próximo passo recomendado

- Reorganizar `components/` em `components/public` / `components/dashboard` / `components/shared`.
- Extrair serviços para `services/shared` e `services/dashboard`.

Referências rápidas

- Arquivos originais consolidados: [README_ARQUITETURA_COMPLETA.md](README_ARQUITETURA_COMPLETA.md), [README_LEGAL_DOCS.md](README_LEGAL_DOCS.md), [README_OPERATIONS.md](README_OPERATIONS.md)
