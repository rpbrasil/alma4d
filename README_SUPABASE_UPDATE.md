# Padronização do Supabase nas APIs — Status

## Padrões identificados

O projeto possui 63 arquivos `route.ts` em `app/api/`. Foram encontrados **5 padrões distintos** de
instanciação do Supabase, com graus diferentes de qualidade:

| #   | Padrão                        | Origem                  | Uso correto                                                                                                  |
| --- | ----------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| A   | `createServerSupabase()`      | `@/lib/supabase/server` | ✅ Ideal para leitura de sessão do usuário via cookies                                                       |
| B   | `createServerClient()` inline | `@supabase/ssr`         | ⚠️ Duplica boilerplate de cookies; deve usar helper A                                                        |
| C   | `getSupabaseAdmin()`          | `@/lib/supabase/admin`  | ✅ Ideal para operações de banco com service role                                                            |
| D   | `createClient()` inline       | `@supabase/supabase-js` | ❌ Duplica credenciais em cada arquivo; deve usar C                                                          |
| E   | `supabaseAdmin()`             | `@/lib/contratos-flow`  | ⚠️ Segunda implementação de admin; difere de C por aceitar `SUPABASE_URL` além de `NEXT_PUBLIC_SUPABASE_URL` |

### Helpers centralizados (referência)

```ts
// @/lib/supabase/admin — Padrão C (service role, sem cookies)
export function getSupabaseAdmin() {
  return createClient(URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// @/lib/supabase/server — Padrão A (anon key + cookies, SSR-aware)
export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(URL, ANON_KEY, { cookies: { ... } });
}
```

---

## Migrações concluídas nesta sessão

### `parceiros/` — 4 arquivos (Padrão D → C)

| Arquivo                                    | Instâncias removidas                                                   |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| `app/api/parceiros/route.ts`               | 2 (GET + POST)                                                         |
| `app/api/parceiros/[id]/route.ts`          | wrapper `getSupabaseAdmin` local removido + 2 variáveis `token` mortas |
| `app/api/parceiros/empresas/route.ts`      | 2 (GET + POST)                                                         |
| `app/api/parceiros/empresas/[id]/route.ts` | 2 (PATCH + DELETE) + 2 variáveis `token` mortas                        |

### `cupons/` e `cupom/` — 4 arquivos (Padrão D → C)

| Arquivo                          | Instâncias removidas                            |
| -------------------------------- | ----------------------------------------------- |
| `app/api/cupons/route.ts`        | 2 (GET + POST)                                  |
| `app/api/cupons/[id]/route.ts`   | 2 (PATCH + DELETE) + 2 variáveis `token` mortas |
| `app/api/cupom/validar/route.ts` | 1                                               |
| `app/api/cupom/auto/route.ts`    | 1                                               |

### `usuarios/` — 9 arquivos (Padrão D → C)

| Arquivo                                           |
| ------------------------------------------------- |
| `app/api/usuarios/update-phone/route.ts`          |
| `app/api/usuarios/update-email/route.ts`          |
| `app/api/usuarios/revoke-other-sessions/route.ts` |
| `app/api/usuarios/confirm-pending-email/route.ts` |
| `app/api/usuarios/confirm-pending-phone/route.ts` |
| `app/api/usuarios/resend-confirmation/route.ts`   |
| `app/api/usuarios/reactivate/route.ts`            |
| `app/api/usuarios/deactivate/route.ts`            |
| `app/api/usuarios/check-bulk/route.ts`            |

**Total migrado: 28 arquivos — zero erros de compilação.**

---

## Pendências

### ~~Prioridade alta~~ ✅ — Padrão D totalmente concluído

Todos os 11 arquivos restantes foram migrados de `createClient` inline para `getSupabaseAdmin()`:

| Arquivo                                       | Observação                                                                           |
| --------------------------------------------- | ------------------------------------------------------------------------------------ |
| `app/api/arquivos/signed-url/route.ts`        |                                                                                      |
| `app/api/auth/by-cpf/route.ts`                |                                                                                      |
| `app/api/copsoq/submit/route.ts`              | parte admin; auth permanece em `createServerClient` (Padrão B)                       |
| `app/api/copsoq/create-link/route.ts`         | parte admin; auth permanece em `createServerClient` (Padrão B)                       |
| `app/api/importacao-usuarios/upload/route.ts` |                                                                                      |
| `app/api/importacao-usuarios/job/route.ts`    |                                                                                      |
| `app/api/importacao-usuarios/erros/route.ts`  |                                                                                      |
| `app/api/financeiro/alertas/route.ts`         |                                                                                      |
| `app/api/nr1/pagamento/route.ts`              | arquivo extenso (~750 linhas)                                                        |
| `app/api/nfse/email/[ref]/email/route.ts`     | cast `as SupabaseClient<Database>` para preservar tipagem local                      |
| `app/api/webhooks/focusnfse/route.ts`         | função `createSupabaseAdmin()` local removida; nota: fallback `SUPABASE_URL` perdido |

### ~~Prioridade média~~ ✅ — Padrão B totalmente concluído

Todos os 11 arquivos foram migrados de `createServerClient` inline para `createServerSupabase()`.
Funções locais `buildSupabase()` e `buildSupabaseFromRequest()` também foram removidas:

| Arquivo                                          | Observação                                       |
| ------------------------------------------------ | ------------------------------------------------ |
| `app/api/admin/tenant-scope/route.ts`            | função `buildSupabaseFromRequest` local removida |
| `app/api/clientes/configuracoes/route.ts`        | função `buildSupabase` local removida            |
| `app/api/copsoq/create-link/route.ts`            |                                                  |
| `app/api/copsoq/status/route.ts`                 |                                                  |
| `app/api/copsoq/submit/route.ts`                 |                                                  |
| `app/api/contrato/by-cliente/route.ts`           |                                                  |
| `app/api/contrato/vagas/resumo/route.ts`         |                                                  |
| `app/api/denuncias/route.ts`                     |                                                  |
| `app/api/entitlements/route.ts`                  |                                                  |
| `app/api/questionario/verificar-acesso/route.ts` |                                                  |
| `app/api/usuarios/search/route.ts`               |                                                  |

### ~~Prioridade baixa~~ ✅ — Padrão E concluído

Todos os 3 arquivos foram migrados. O `supabaseAdmin()` de `contratos-flow` foi substituído por
`getSupabaseAdmin()` de `@/lib/supabase/admin`. Nos arquivos que ainda importavam outras
exportações de `contratos-flow` (`activateContratoFull`, `getContrato`, `markFailOrCancel`),
somente `supabaseAdmin` foi removido da lista de imports:

| Arquivo                                  | Observação                                             |
| ---------------------------------------- | ------------------------------------------------------ |
| `app/api/contrato/pdf/route.tsx`         | import `contratos-flow` removido completamente         |
| `app/api/pagarme/verificar-pix/route.ts` | `supabaseAdmin` removido do import de `contratos-flow` |
| `app/api/webhooks/pagarme/route.ts`      | `supabaseAdmin` removido do import de `contratos-flow` |

### Libs e Edge Functions — 2 pendências resolvidas

| Arquivo                                           | Mudança                                                               |
| ------------------------------------------------- | --------------------------------------------------------------------- |
| `app/lib/precificacao/config-core.ts`             | `createClient` inline → `getSupabaseAdmin()`                          |
| `supabase/functions/gerar-pdf-contratos/index.ts` | `createClient` inline → `supabaseAdmin` do `_shared/supabaseAdmin.ts` |

---

## Estado atual (resumo numérico)

### Route Handlers (`app/api/`)

| Padrão                             | Antes        | Migrados | Pendente |
| ---------------------------------- | ------------ | -------- | -------- |
| D — `createClient` inline          | ~25 arquivos | **28**   | **0** ✅ |
| B — `createServerClient` inline    | 11 arquivos  | **11**   | **0** ✅ |
| E — `supabaseAdmin` contratos-flow | 3 arquivos   | **3**    | **0** ✅ |

### Fora de `app/api/`

| Arquivo / Camada                                  | Padrão                                             | Status     |
| ------------------------------------------------- | -------------------------------------------------- | ---------- |
| `app/lib/supabase/admin.ts`                       | helper centralizado                                | ✅         |
| `app/lib/supabase/server.ts`                      | helper centralizado                                | ✅         |
| `app/lib/supabase/browser.ts`                     | singleton `createBrowserClient`                    | ✅         |
| `app/lib/supabase/client.ts`                      | helper browser                                     | ✅         |
| `app/services/profissionais.ts`                   | `createServerSupabase()`                           | ✅         |
| `app/lib/precificacao/config-core.ts`             | `createClient` inline → **migrado**                | ✅         |
| `app/lib/contratos-flow.ts`                       | `supabaseAdmin()` própria — usada por scripts Node | ⚠️ manter  |
| `app/context/auth.tsx` + páginas dashboard        | `getSupabaseClient()` browser                      | ✅         |
| `supabase/functions/_shared/supabaseAdmin.ts`     | singleton Deno                                     | ✅         |
| `supabase/functions/webhook-worker/index.ts`      | usa `_shared`                                      | ✅         |
| `supabase/functions/email_notify/index.ts`        | usa `_shared`                                      | ✅         |
| `supabase/functions/gerar-pdf-contratos/index.ts` | `createClient` inline → **migrado**                | ✅         |
| `scripts/worker-webhook-processor.ts`             | `supabaseAdmin` de `contratos-flow`                | ⚠️ manter¹ |

> ¹ Scripts Node rodam fora do Next.js e dependem de `SUPABASE_URL` (sem prefixo `NEXT_PUBLIC_`).
> Não alterar sem revisar variáveis de ambiente do ambiente de execução dos scripts.

**Resultado: `createClient` inline completamente eliminado de todo o código-fonte da aplicação.**
