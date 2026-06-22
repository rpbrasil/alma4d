# README - Operações, NFSe, Storage e Secrets

Objetivo: centralizar procedimentos operacionais, configuração de storage, migração de arquivos, secrets internos e guias de teste para permitir que desenvolvedores e automações executem tarefas operacionais com segurança.

Resumo rápido

- Bucket Supabase: configure `NFSE_STORAGE_BUCKET` (ex.: `nfse`) — privado.
- Secret interno: `INTERNAL_API_SECRET` — header `x-internal-secret` para endpoints internos.

Principais endpoints (NFSe)

- `POST /api/nfse/emitir` — interno (worker/worker -> requireInternalSecret)
- `POST /api/nfse/email/:ref/email` — interno (envia email pelo provedor)
- `GET /api/nfse/by-cliente` — retorna NFSe do `cliente_id` do usuário autenticado
- `GET /api/nfse/file` — ownership checks e `createSignedUrl`

Storage & migração

1. Crie bucket privado `NFSE_STORAGE_BUCKET`.
2. Convenção de paths: `<cliente_id>/<ref>/<file>`.
3. Migração: para registros com `url_danfse` apontando para URL externa:
   - baixar o arquivo server-side;
   - subir ao bucket (`admin.storage.from(bucket).upload(path, buffer)`);
   - atualizar `nfse_emissoes` com o `storage path` (manter backup das URLs originais).

Segurança operacional

- Rotação do `INTERNAL_API_SECRET`: atualize app, worker e functions em deploy coordenado.
- Logging: monitorar falhas de autenticação interna e falhas de criação de signed URLs.
- Alertas: configurar alertas para filas DLQ e `webhook_dead_letter`.

Testes e exemplos

- Emitir (interno):

```
curl -X POST "https://alma4d.com.br/api/nfse/emitir" \
  -H "Content-Type: application/json" \
  -H "x-internal-secret: $INTERNAL_API_SECRET" \
  --data-raw '{"contrato_id":"<CONTRATO_ID>"}'
```

- Obter arquivo (cliente autenticado):

```
curl "https://alma4d.com.br/api/nfse/file?ref=<REF>&kind=danfse" -b cookie.txt
```

Debug endpoints

- Temporariamente habilitáveis com `DEBUG_ENDPOINTS=true` — não habilitar em produção sem IP allowlist.

Runbook breve (migração automática)

1. Script itera `nfse_emissoes` com `url_danfse` externo.
2. Para cada registro: baixa → upload para `NFSE_STORAGE_BUCKET` → atualiza row com `caminho_xml_nota_fiscal` e/ou `url_danfse` (storage path).
3. Log/backup: escrever registro em `nfse_migration_log` para auditoria/rollback.

Onde olhar no código

- `app/api/nfse/*` — endpoints e ownership checks
- `app/lib/internal_secret.ts` — validação `x-internal-secret`
- `supabase/functions/webhook-worker/index.ts` — worker que chama `/api/nfse/emitir`

Referências

- Guia de diagnóstico de contratos e PDFs: consolidado neste arquivo (seção "Testes e exemplos").
