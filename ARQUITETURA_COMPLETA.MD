## 🧠 ARQUITETURA COMPLETA — FLUXO DE AUTENTICAÇÃO → CONTRATO → PAGAMENTO (NR‑1 SaaS)

### 🎯 OBJETIVO
Implementar um fluxo robusto, idempotente e seguro de onboarding e pagamento para empresas (PJ), incluindo:

- Autenticação OTP (SMS ou Email)
- Resolução determinística de usuário
- Criação/atualização de cliente (empresa)
- Geração de contrato
- Aceite formal do contrato
- Execução de pagamento

Stack: Supabase (Auth + Postgres) + Next.js

---

# 🏗️ MODELAGEM DE DADOS

## Tabelas

### auth.users
- Identidade primária (OTP)
- Gerenciado pelo Supabase

---

### usuarios
- Entidade do sistema
- Independente de auth.users
- Constraints:
  - email UNIQUE
  - telefone UNIQUE

---

### usuario_auth_identities
- Tabela intermediária de vínculo
- Estrutura:
    auth_user_id → usuario_id

- PRIMARY KEY: auth_user_id
- Fonte principal de identidade

---

### clientes
- Representa empresa (CNPJ)
- UPSERT por documento

---

### contratos
- Representa contratação
- Sempre cria novo (status: rascunho)

---

# 🔐 ETAPA 1 — AUTENTICAÇÃO (OTP)

Usuário escolhe:
- SMS OU Email

Execução:

    supabase.auth.signInWithOtp(...)
    supabase.auth.verifyOtp(...)

Após validação:

    auth_user_id = supabase.auth.getUser().id

---

# 🧠 ETAPA 2 — RESOLUÇÃO DO USUÁRIO (IDEMPOTENTE)

Ordem obrigatória:

## 1. Identity (fonte principal)

    SELECT usuario_id
    FROM usuario_auth_identities
    WHERE auth_user_id = p_auth_user_id
    LIMIT 1

---

## 2. Fallback por email

    SELECT id FROM usuarios
    WHERE lower(email) = lower(p_email)

---

## 3. Fallback por telefone

    SELECT id FROM usuarios
    WHERE telefone = p_telefone

---

## 4. Criar se não existir (com proteção)

    BEGIN
      INSERT INTO usuarios (...)
      RETURNING id
    EXCEPTION
      WHEN unique_violation THEN
        -- retry controlado:
        SELECT por email -> depois telefone

---

## 5. Criar vínculo

    INSERT INTO usuario_auth_identities
    ON CONFLICT (auth_user_id) DO UPDATE

---

⚠️ REGRAS IMPORTANTES:

- Nunca usar auth_user_id como usuarios.id
- Nunca usar email OR telefone no mesmo SELECT
- Sempre tratar unique_violation (concorrência)

---

# 🏢 ETAPA 3 — CLIENTE (UPSERT)

    INSERT INTO clientes (...)
    ON CONFLICT (documento) DO UPDATE
    RETURNING cliente_id

---

# 📄 ETAPA 4 — CONTRATO

    INSERT INTO contratos (...)
    status = 'rascunho'
    RETURNING contrato_id

---

# 🔁 ETAPA 5 — REDIRECIONAMENTO

Frontend:

    /ativacao?cliente_id=...&contrato_id=...

⚠️ NÃO CONFIÁVEL

---

# ✅ ETAPA 6 — VALIDAÇÃO DE ACESSO

Backend garante:

    contrato.cliente_id === perfil.cliente_id

Verifica também:
- cliente ativo
- contrato não ativo

---

# 🧾 ETAPA 7 — WIZARD

### STEP 1 — Revisão
- contrato via iframe
- scroll obrigatório
- libera aceite

---

### STEP 2 — Dados
- Nome
- CPF
- Email (origem: servidor, NÃO URL)

---

### STEP 3 — Pagamento
- obrigatório:
    userId
    clienteId (do contrato, não URL)
    contratoId

---

# ✅ ETAPA 8 — ACEITE FORMAL

    POST /api/contrato/aceite

Registra:
- nome
- documento
- versão termos
- timestamp
- IP

---

# 💳 ETAPA 9 — PAGAMENTO

Componente:

    NR1PaymentPanel({
      userId,
      clienteId,
      contratoId,
      precoTotalCents,
      cupomCodigo
    })

Gateway: ex (Pagar.me)

---

# 🔒 PRINCÍPIOS

## IDENTITY FIRST
auth_user_id sempre resolve usuario_id

## IDEMPOTÊNCIA
- sem duplicação
- tolerante a retry

## CONSISTÊNCIA
usuario_auth_identities é fonte principal

## SEGURANÇA
- nunca confiar em query params
- sempre validar ownership

## RESILIÊNCIA
- tratar unique_violation
- suportar concorrência

---

# 🚨 ANTÍ-PADRÕES (PROIBIDOS)

❌ usar auth_user_id como usuarios.id  
❌ confiar em email da URL  
❌ confiar em cliente_id da URL  
❌ usar WHERE email OR telefone  
❌ não tratar concorrência  

---

# ✅ RESULTADO ESPERADO

Fluxo:

- sem duplicação
- sem erro de unique constraint
- suporte a OTP híbrido (email + SMS)
- tolerante a retry
- seguro contra manipulação

---

# 📊 DIAGRAMA COMPLETO

             ┌──────────────────────────┐
             │     Usuário inicia       │
             │   Signup / Checkout      │
             └──────────┬───────────────┘
                        │
                        ▼
         ┌──────────────────────────────┐
         │   OTP (SMS ou Email)         │
         │ Supabase Auth (auth.users)   │
         └──────────┬───────────────────┘
                    │
                    ▼
      ┌────────────────────────────────────┐
      │ Resolver usuario_id                │
      │                                    │
      │ 1. usuario_auth_identities         │
      │ 2. email                           │
      │ 3. telefone                        │
      │ 4. create + retry (exception)      │
      └──────────┬────────────────────────┘
                 │
                 ▼
      ┌────────────────────────────────────┐
      │ UPSERT cliente (CNPJ)              │
      │ tabela: clientes                  │
      └──────────┬────────────────────────┘
                 │
                 ▼
      ┌────────────────────────────────────┐
      │ Criar contrato                    │
      │ status = rascunho                 │
      └──────────┬────────────────────────┘
                 │
                 ▼
      ┌────────────────────────────────────┐
      │ Redirect → /ativacao              │
      │ contrato_id + cliente_id (URL)    │
      │ ⚠️ validar no backend             │
      └──────────┬────────────────────────┘
                 │
                 ▼
      ┌────────────────────────────────────┐
      │ Wizard Frontend                    │
      │ Step 1 → Revisão + termos          │
      │ Step 2 → Dados (CPF, nome)         │
      │ Step 3 → Pagamento                │
      └──────────┬────────────────────────┘
                 │
                 ▼
      ┌────────────────────────────────────┐
      │ Validação servidor (whoami)        │
      │ cliente_id == contrato.cliente_id │
      └──────────┬────────────────────────┘
                 │
                 ▼
      ┌────────────────────────────────────┐
      │ Aceite contrato                   │
      │ /api/contrato/aceite             │
      └──────────┬────────────────────────┘
                 │
                 ▼
      ┌────────────────────────────────────┐
      │ Pagamento (NR1PaymentPanel)       │
      │ Gateway (Pagar.me etc)           │
      └──────────┬────────────────────────┘
                 │
                 ▼
      ┌────────────────────────────────────┐
      │ Contrato → ativo                  │
      │ Liberação sistema                │
      └────────────────────────────────────┘

---

## 🧠 INSTRUÇÃO FINAL PARA QUALQUER IA

Sempre trate:
- auth_user_id como raiz de identidade
- usuario_auth_identities como fonte oficial
- email/telefone como fallback apenas

Garanta:
- idempotência
- segurança
- validação no servidor
- tolerância a concorrência

Nunca:
- confie na URL
- duplique registros
- ignore constraints do banco
