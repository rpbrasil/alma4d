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

Nunca usar auth_user_id como usuarios.id
Nunca usar email OR telefone na mesma query
Sempre tratar concorrência


🏢 ETAPA 3 — CLIENTE
INSERT INTO clientes
ON CONFLICT (documento) DO UPDATE
RETURNING cliente_id


📄 ETAPA 4 — CONTRATO
INSERT INTO contratos
status = 'rascunho'
RETURNING contrato_id


🔁 ETAPA 5 — REDIRECIONAMENTO
Frontend:
/ativacao?cliente_id=...&contrato_id=...

⚠️ NÃO confiável → backend valida sempre

✅ ETAPA 6 — VALIDAÇÃO DE ACESSO
Servidor garante:
contrato.cliente_id === usuario.cliente_id

Verifica:

cliente ativo
contrato válido


🧾 ETAPA 7 — WIZARD
STEP 1

revisão contrato
aceite obrigatório

STEP 2

dados (nome, CPF)
origem servidor (não URL)

STEP 3

pagamento


✅ ETAPA 8 — ACEITE FORMAL
POST /api/contrato/aceite

Registra:

nome
documento
versão termos
timestamp
IP


💳 ETAPA 9 — PAGAMENTO
Gateway (ex: Pagar.me)
Fluxo:
Frontend → Gateway → Webhook


⚙️ ETAPA 10 — WEBHOOK
Responsabilidades:
✅ validar assinatura
✅ validar idempotência (webhook_logs)
✅ validar valor
✅ detectar upgrade
✅ ativar contrato

❗ IMPORTANTE
❌ NÃO gera PDF


⚙️ ETAPA 11 — ATIVAÇÃO DE CONTRATO
Função:
activateContratoFull


Faz:
status = ativo ✅
ativa usuário ✅
evento contrato_ativado ✅
evento pdf_pending ✅
pdf_status = pending ✅


NÃO faz:
❌ gerar PDF


📄 ETAPA 12 — GERAÇÃO DE PDF (ASSÍNCRONA)
🔁 WORKER (Edge Function + Cron)
Cron:
*/1 * * * *

Execução:
buscar contratos onde:
  pdf_status IN ('pending', 'error')
  pdf_attempts < 3

para cada contrato:
  → chamar API PDF


🌐 ETAPA 13 — API CENTRAL DE PDF
Endpoint:
POST /api/contratos/pdf

Responsável por:
1. marcar processing ✅
2. gerar PDF (Node runtime) ✅
3. salvar no storage ✅
4. atualizar contrato ✅
5. registrar evento ✅
6. tratar erro e retry ✅


🔄 FLUXO FINAL COMPLETO
Usuário paga
        │
        ▼
Webhook
        │
        ▼
activateContratoFull
        │
        ├── status = ativo ✅
        ├── pdf_status = pending ✅
        └── evento pdf_pending ✅
        │
        ▼
⏱️ Cron Worker (Edge)
        │
        ▼
/api/contratos/pdf
        │
        ▼
Next API (Node)
        │
        ├── gerar PDF ✅
        ├── salvar ✅
        ├── atualizar status ✅
        ▼
PDF pronto ✅


🔒 PRINCÍPIOS
✅ IDENTITY FIRST
auth_user_id → usuario_auth_identities

✅ IDEMPOTÊNCIA

webhook_logs
contrato_eventos


✅ CONSISTÊNCIA

contrato ≠ pedido
eventos auditáveis


✅ SEGURANÇA

nunca confiar em URL
validar ownership no backend


✅ RESILIÊNCIA
PDF não bloqueia contrato ✅


✅ PROCESSAMENTO ASSÍNCRONO
pdf_status + worker + retry ✅


🚨 ANTÍ-PADRÕES (PROIBIDOS)
❌ gerar PDF no webhook
❌ gerar PDF dentro do activateContratoFull
❌ compartilhar código Node com Edge
❌ confiar em query params
❌ ignorar constraints do banco
❌ não tratar concorrência

✅ RESULTADO
Sistema:
✔ resiliente  
✔ escalável  
✔ auditável  
✔ desacoplado  
✔ preparado para falhas  
✔ sem duplicação  
✔ compatível com retry  


📊 DIAGRAMA FINAL
Auth (OTP)
   ↓
usuario_auth_identities
   ↓
usuarios
   ↓
clientes
   ↓
contratos (rascunho)
   ↓
Wizard + aceite
   ↓
Pagamento
   ↓
Webhook
   ↓
activateContratoFull
   ↓
status = ativo + pdf_pending
   ↓
Edge Worker (cron)
   ↓
API /contratos/pdf
   ↓
PDF gerado
   ↓
pdf_status = done ✅


🧠 INSTRUÇÃO FINAL (PARA IA)
Sempre tratar:

auth_user_id como raiz
usuario_auth_identities como fonte oficial
PDF como processo assíncrono

Garantir:

idempotência
segurança
consistência
tolerância a concorrência

Nunca:

acoplar PDF ao pagamento
confiar na URL
duplicar identidade