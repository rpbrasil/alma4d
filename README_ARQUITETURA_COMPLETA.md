🧠 ARQUITETURA COMPLETA — FLUXO DE AUTENTICAÇÃO → CONTRATO → PAGAMENTO → PDF (NR‑1 SaaS)

🎯 OBJETIVO
Implementar um fluxo robusto, idempotente, seguro e resiliente de onboarding e billing para empresas (PJ), incluindo:

Autenticação OTP (SMS ou Email)
Resolução determinística de usuário
Criação/atualização de cliente (empresa)
Geração de contrato
Aceite formal do contrato
Execução de pagamento
Ativação do contrato
Geração assíncrona de PDF do contrato

Stack: Supabase (Auth + Postgres) + Next.js + Edge Functions

🏗️ MODELAGEM DE DADOS
Tabelas
auth.users

Identidade primária (OTP)
Gerenciado pelo Supabase

usuarios

Entidade do sistema
Independente de auth.users
Constraints:

email UNIQUE
telefone UNIQUE

usuario_auth_identities

Tabela intermediária de vínculo

Estrutura:
auth_user_id → usuario_id

PRIMARY KEY: auth_user_id

Fonte oficial de identidade

clientes

Representa empresa (CNPJ)
UPSERT por documento

contratos

Representa contratação
Sempre cria novo registro

Campos importantes:
SQLstatus text -- rascunho | ativo | suspenso | encerradopdf_status text default 'pending'pdf_error text nullpdf_attempts int default 0pdf_generated_at timestamptz nullShow more lines

contrato_eventos

Audit trail completo

Eventos relevantes:
contrato_ativado
pdf_pending
pdf_generated
pdf_failed
pdf_flag_failed

webhook_logs

Idempotência de eventos do gateway

🔐 ETAPA 1 — AUTENTICAÇÃO (OTP)
Usuário escolhe:

SMS OU Email

Execução:
supabase.auth.signInWithOtp(...)
supabase.auth.verifyOtp(...)

Resultado:
auth_user_id = supabase.auth.getUser().id

🧠 ETAPA 2 — RESOLUÇÃO DO USUÁRIO (IDEMPOTENTE)
Ordem obrigatória:

1. Identity (fonte principal)
   SELECT usuario_id
   FROM usuario_auth_identities
   WHERE auth_user_id = p_auth_user_id
   LIMIT 1

2. Fallback por email
   SELECT id FROM usuarios
   WHERE lower(email) = lower(p_email)

3. Fallback por telefone
   SELECT id FROM usuarios
   WHERE telefone = p_telefone

4. Criar se não existir

com controle de concorrência

INSERT INTO usuarios (...)
EXCEPTION unique_violation → retry controlado

5. Criar vínculo
   INSERT INTO usuario_auth_identities
   ON CONFLICT DO UPDATE

⚠️ REGRAS
🧠 ARQUITETURA COMPLETA — Fluxo: Autenticação → Contrato → Pagamento → PDF (NR‑1 SaaS)

🎯 Objetivo
Implementar um fluxo idempotente, seguro e resiliente de onboarding e billing para empresas (PJ).

Inclui:

- Autenticação OTP (SMS ou e‑mail)
- Resolução determinística de usuário
- Criação/atualização de cliente (CNPJ)
- Geração e aceite de contrato
- Execução de pagamento via gateway
- Ativação do contrato
- Geração assíncrona de PDF

Stack: Supabase (Auth + Postgres) + Next.js + Edge Functions

🏗️ Modelagem de dados (resumo)

- `auth.users`: identidade primária (OTP) — gerenciada pelo Supabase
- `usuarios`: entidade do sistema (independente de `auth.users`)
  - `email` UNIQUE
  - `telefone` UNIQUE
- `usuario_auth_identities`: vínculo entre `auth_user_id` → `usuario_id` (PK: `auth_user_id`)
- `clientes`: representa empresa (CNPJ). Upsert por `documento`.
- `contratos`: representa contratação. Sempre cria novos registros.
  - Campos importantes: `status` (rascunho|ativo|suspenso|encerrado), `pdf_status` (default: 'pending'), `pdf_error`, `pdf_attempts` (default 0), `pdf_generated_at` (timestamptz)
- `contrato_eventos`: audit trail (ex.: `contrato_ativado`, `pdf_pending`, `pdf_generated`, `pdf_failed`)
- `webhook_logs`: controle de idempotência dos webhooks

🔐 Etapas (resumo operacional)

1. Autenticação (OTP)
   - Cliente: `supabase.auth.signInWithOtp()` / `verifyOtp()` → `auth_user_id`

2. Resolução do usuário (idempotente)
   - Origens, em ordem:
     1. `usuario_auth_identities` by `auth_user_id`
     2. `usuarios` lookup por `email` (case‑insensitive)
     3. `usuarios` lookup por `telefone`
     4. Criar `usuarios` se não existir (tratar concorrência / unique_violation com retry controlado)
   - Garantir insert/upsert em `usuario_auth_identities` com `ON CONFLICT` para vínculo
   - Regras: nunca usar `auth_user_id` como `usuarios.id`; não combinar email e telefone em mesma query; sempre tratar concorrência

3. Cliente
   - `INSERT INTO clientes ... ON CONFLICT(documento) DO UPDATE RETURNING cliente_id`

4. Contrato
   - Criar contrato em `status = 'rascunho'` e retornar `contrato_id`

5. Redirecionamento
   - Frontend pode navegar para `/ativacao?cliente_id=...&contrato_id=...` (não confiar — backend valida sempre)

6. Validação de acesso
   - Server: garantir `contrato.cliente_id === usuario.cliente_id` e cliente/contrato ativos válidos

7. Wizard (aceite)
   - Step 1: revisão do contrato e aceite formal
   - Step 2: dados pessoais (nome, CPF) — origem do servidor, não da URL
   - Step 3: pagamento

8. Aceite formal
   - Endpoint: `POST /api/contrato/aceite`
   - Registra: nome, documento, versão dos termos, timestamp, IP

9. Pagamento
   - Gateway ex.: Pagar.me
   - Fluxo: Frontend → Gateway → Webhook (não gerar PDF aqui)

10. Webhook

- Responsabilidades (server side): validar assinatura, idempotência via `webhook_logs`, validar valor, detectar upgrades, acionar `activateContratoFull`
- NÃO gerar PDF no webhook

11. Ativação do contrato

- Função: `activateContratoFull`
- Deve: marcar `status = 'ativo'`, ativar usuário, emitir evento `contrato_ativado`, emitir `pdf_pending` (ou setar `pdf_status = 'pending'`)
- NÃO deve gerar PDF nem bloquear conclusão do pagamento

12. Geração de PDF (assíncrona)

- Worker (Edge Function + Cron, ex.: `*/1 * * * *`) varre contratos com `pdf_status IN ('pending','error') AND pdf_attempts < 3`
- Worker chama API central de PDF

13. API central de PDF (`POST /api/contratos/pdf`)

- Responsável por: marcar `processing`, gerar PDF (Node), salvar no storage, atualizar `contratos` (`pdf_status`, `pdf_generated_at`), registrar evento, tratar erros e retries

Princípios

- Identity first: `auth_user_id` → `usuario_auth_identities`
- Idempotência: `webhook_logs`, `contrato_eventos`
- Segurança: nunca confiar em query params para autorização; validar ownership no backend
- Resiliência: processamento assíncrono do PDF, retries controlados

Antipadrões proibidos

- Gerar PDF no webhook ou dentro de `activateContratoFull`
- Compartilhar código Node incompatível entre Edge e Node runtimes
- Confiar em query params para segurança
- Ignorar constraints do banco ou concorrência

Resultado esperado

- Sistema resiliente, escalável, auditável, desacoplado e tolerante a falhas

Diagrama simplificado
Auth (OTP) → usuario_auth_identities → usuarios → clientes → contratos (rascunho) → Wizard + aceite → Pagamento → Webhook → activateContratoFull → status=ativo + pdf_pending → Edge Worker (cron) → API /contratos/pdf → PDF gerado

Instrução final (para auditar/automatizar)

- Tratar `auth_user_id` como raiz de identidade
- `usuario_auth_identities` é a fonte oficial de vínculo
- PDF é sempre processo assíncrono, com `pdf_status`, `pdf_attempts` e eventos
- Garantir idempotência, segurança, consistência e tolerância a concorrência

## Code Standards

### Required Before Each Commit
- Run `npm run lint` to ensure code follows project standards
- Make sure all components follow Next.js App Router patterns
- Client components should be marked with 'use client' when they use browser APIs or React hooks
- When adding new functionality, make sure you update the README
- Make sure that the repository structure documentation is correct and accurate in the Copilot Instructions file
- Ensure all tests pass by running `npm run test` in the terminal

### TypeScript and React Patterns
- Use TypeScript interfaces/types for all props and data structures
- Follow React best practices (hooks, functional components)
- Use proper state management techniques
- Components should be modular and follow single-responsibility principle

### Styling
- You must prioritize using Tailwind CSS classes as much as possible. If needed, you may define custom Tailwind Classes / Styles. Creating custom CSS should be the last approach.

## Development Flow
- Install dependencies: `npm install`
- Development server: `npm run dev`
- Build: `npm run build`
- Test: `npm run test`
- Lint: `npm run lint`

## Repository Structure
- `app/`: Next.js App Router pages and layouts organized by route
- `components/`: Reusable React components
  - `components/ui/`: UI components (buttons, inputs, etc.)
  - `components/__tests__/`: Component tests
- `lib/`: Core logic and services
  - `lib/data/`: Data models and mock data
  - `lib/types/`: TypeScript type definitions
- `public/`: Static assets
- `tests/`: Test files and test utilities
- `README.md`: Project documentation

## Key Guidelines
1. Make sure to evaluate the components you're creating, and whether they need 'use client'
2. Images should contain meaningful alt text unless they are purely for decoration. If they are for decoration only, a null (empty) alt text should be provided (alt="") so that the images are ignored by the screen reader.
3. Follow Next.js best practices for data fetching, routing, and rendering
4. Use proper error handling and loading states
5. Optimize components and pages for performance