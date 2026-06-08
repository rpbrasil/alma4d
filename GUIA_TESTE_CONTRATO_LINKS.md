# 🔧 Guia de Teste - Links de Contrato

## Problemas Resolvidos

### ✅ Problema: PDFs não estavam sendo encontrados no Supabase Storage

O sistema estava salvando PDFs com o caminho correto (`clientes/{id}/contratos/.../arquivo.pdf`), mas havia problemas na normalização do caminho quando recuperava.

### ✅ Solução Implementada

#### 1. **Função `normalizePdfReference` Melhorada**

- Detecta e processa URLs assinadas Supabase (com `/sign/`)
- Trata caminhos relativos simples
- **Recupera caminhos corrompidos** (quando começa com UUID em vez de `clientes/`)
- Extrai corretamente o caminho para uso no `createSignedUrl()`

#### 2. **Novo Endpoint de Diagnóstico**

- Acesse: `http://localhost:3000/api/contrato/diagnostico?contratoId=SEU_ID_AQUI`
- Retorna checklist completo:
  - Status do contrato no banco
  - Campos PDF encontrados
  - Arquivo existe no Storage?
  - URL assinada gerada com sucesso?
  - Eventos registrados

#### 3. **Botão "Diagnosticar" na Interface**

- Quando ocorre erro ao abrir/baixar PDF
- Clique em "🔍 Diagnosticar"
- Mostra resultado do diagnóstico em popup
- Confira o `console.log` para logs detalhados

---

## 🧪 Como Testar

### Teste 1: Status e Eventos

```bash
# Verifique se o contrato está retornando dados corretos
curl -s "http://localhost:3000/api/contrato/status?contratoId=69960e20-ac87-4717-97dd-0d655b9ae6a9" | jq
```

Deve retornar:

```json
{
  "contrato": {
    "id": "69960e20-ac87-4717-97dd-0d655b9ae6a9",
    "pdf_url": "clientes/d890ba65-b94b-4e06-879e-a295a284bf0e/contratos/573591bc-93ff-4b68-ac98-bd8303a05300/v1/contrato-gerado.pdf",
    "status": "ativo",
    ...
  }
}
```

### Teste 2: Diagnóstico Completo

```bash
# Acesse no navegador ou curl
curl -s "http://localhost:3000/api/contrato/diagnostico?contratoId=69960e20-ac87-4717-97dd-0d655b9ae6a9" | jq
```

Procure por:

- `"arquivo_existe": true` ✓
- `"resultado": "✓ Encontrado (XXXXX bytes)"` ✓
- `"check": "Geração de URL assinada"` com `"resultado": "✓ OK"` ✓

### Teste 3: PDF via UI

1. Abra: `http://localhost:3000/contrato/69960e20-ac87-4717-97dd-0d655b9ae6a9`
2. Clique em "Abrir contrato (PDF)" ou "Baixar PDF"
3. Verifique console do navegador (`F12 → Console`)
4. Se houver erro, clique no botão "🔍 Diagnosticar"

### Teste 4: Dashboard Express

1. Acesse: `http://localhost:3000/dashboard/express/contrato`
2. Clique em "Visualizar" ou "Baixar" em um contrato
3. Deve abrir/baixar o PDF do Supabase Storage

---

## 📊 Logs Esperados

### Sucesso no Console

```
[PDF-URL] ✓ Success: {
  contratoId: "...",
  numero_contrato: "NR1-2026-05-06-1778101212112",
  pdfPath: "clientes/.../arquivo.pdf",
  signedUrlLength: 450
}
```

### Se Caminho Corrompido (mas recuperável)

```
[normalizePdfReference] Caminho com UUID detectado: {
  original: "7f3a1c8e-9d4b-4c7f-9b8d-2a1c4f8c1234/contratos/...",
  msg: "Caminho pode estar corrompido. Esperado: clientes/{id}/contratos/..."
}
[normalizePdfReference] Caminho recuperado: {
  recovered: "clientes/7f3a1c8e-9d4b.../contratos/..."
}
```

---

## 🐛 Troubleshooting

### "PDF não foi gerado ainda"

- Verifique se `pagarme_payment_status` = "paid" no banco
- Confirme que webhook foi acionado após pagamento
- Use `/api/contrato/diagnostico` para ver eventos

### "Arquivo PDF não encontrado no armazenamento"

- O arquivo foi deletado do Supabase?
- Verifique no console de diagnóstico: `"arquivo_existe": false`
- Gere novo PDF via `/api/contrato/gerar-pdf` ###MUDOU!!! PUPPETEER

### "Erro ao gerar URL assinada"

- Confirme credenciais Supabase no `.env`
- Verifique permissões do bucket `contratos`
- Confira se caminho foi normalizado corretamente

---

## 🔍 Endpoints Úteis para Debug

| Endpoint                                   | Propósito                       |
| ------------------------------------------ | ------------------------------- |
| `/api/contrato/status?contratoId=...`      | Status atual + campos PDF       |
| `/api/contrato/diagnostico?contratoId=...` | Diagnóstico completo com checks |
| `/api/contrato/eventos?contratoId=...`     | Timeline de eventos             |
| `/api/contrato/pdf-url?contratoId=...`     | Gera URL assinada (se tudo OK)  |

---

## ✅ Checklist de Validação

- [ ] Endpoint `/api/contrato/diagnostico` retorna JSON válido
- [ ] Campo `"arquivo_existe": true`
- [ ] Campo `"resultado": "✓ Encontrado"`
- [ ] URL assinada gerada com sucesso
- [ ] Botão "Abrir contrato (PDF)" abre no navegador
- [ ] Botão "Baixar PDF" baixa arquivo
- [ ] Visualizar no dashboard express funciona
- [ ] Console não mostra erros ao abrir PDFs

---

**Nota**: Se ainda houver problemas, execute:

```javascript
// No console do navegador
fetch("/api/contrato/diagnostico?contratoId=SEU_ID")
  .then((r) => r.json())
  .then((d) => console.log(JSON.stringify(d, null, 2)));
```

E compartilhe o output completo para análise.
