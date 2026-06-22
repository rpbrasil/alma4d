# INTERNAL_API_SECRET — configuração e implantação

Este projeto usa um header HTTP `x-internal-secret` para proteger endpoints internos relacionados a NFSe (`/api/nfse/emitir`, `/api/nfse/email/...`).

O valor esperado é fornecido pela variável de ambiente `INTERNAL_API_SECRET` tanto na aplicação Next.js quanto no worker (Deno/Supabase Functions). Siga os passos abaixo para configurar corretamente em desenvolvimento e produção.

1. Gerar um secret forte

- No seu ambiente local, gere um valor seguro. Exemplo (PowerShell):

```powershell
# PowerShell
[guid]::NewGuid().Guid
```

Ou (Linux/macOS):

```bash
openssl rand -hex 32
```

2. Adicionar `INTERNAL_API_SECRET` ao ambiente

- Local (.env.local) — para Next.js localmente, adicione no `.env.local` na raiz do projeto:

```
INTERNAL_API_SECRET=seu_valor_super_secreto_aqui
```

- Deno Worker / Supabase Functions — configure a variável no ambiente da função:

- Para Supabase local (deno deploy), exporte a variável no ambiente da função de worker:

```bash
export INTERNAL_API_SECRET=seu_valor_super_secreto_aqui
```

- No painel de implantação (Vercel/Netlify/Azure/GCP/Supabase):
  - Adicione `INTERNAL_API_SECRET` como secret/env var para a sua aplicação Next.js.
  - Adicione o mesmo valor nas variáveis de ambiente da função `webhook-worker` (supabase functions) e em quaisquer runners que chamem os endpoints internos.

3. Verificar chamadas internas

- O worker (`supabase/functions/webhook-worker/index.ts`) foi atualizado para enviar `x-internal-secret` nas chamadas a `/api/nfse/emitir`.
- O endpoint `/api/nfse/[ref]` também envia `x-internal-secret` quando dispara o envio de e-mail automático.

4. Rotação e segurança operacional

- Para rotacionar, atualize a variável em todos os ambientes (app + worker) e faça um deploy coordenado.
- Registre acessos e falhas de autenticação para detectar usos indevidos.

5. Testes locais

- Teste o endpoint protegido com `curl` incluindo o header:

```bash
curl -X POST https://seu-host/api/nfse/emitir \
  -H "Content-Type: application/json" \
  -H "x-internal-secret: $INTERNAL_API_SECRET" \
  -d '{"contrato_id":"abc-123"}'
```

6. Notas

- Se `INTERNAL_API_SECRET` não estiver configurado, os endpoints retornarão 500 (erro de configuração) ou 401 (não autorizado).
- Garanta que o valor seja tratado como secret na sua plataforma de CI/CD e não seja comitado em repositórios.

---

Se quiser, eu atualizo o `supabase/functions` environment config ou gero um pequeno script de deploy para sincronizar a variável entre app e worker. Quer que eu faça isso?
