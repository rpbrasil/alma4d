# ✅ Fase 2 Verification Checklist

Use este documento para validar que tudo foi implementado corretamente.

---

## 🔍 Verificações de Código

### Services Layer (`services/profissionais.ts`)

- [ ] `getProfissionaisAtivos()` - Sem `clienteId` no param
- [ ] `getProfissionaisCrud()` - Sem `clienteId` no param
- [ ] `getProfissionalById(id)` - Usa apenas `id`
- [ ] `createProfissional(data)` - Não espera `cliente_id` em data
- [ ] `updateProfissional(id, updates)` - Error handling para 23505
- [ ] `deleteProfissional(id)` - Implementado
- [ ] `toggleProfissionalStatus(id, ativo)` - Implementado
- [ ] `searchProfissionais(term)` - Sem `clienteId` no param

**Como verificar:**

```bash
# Abra: alma4d-dashboard/services/profissionais.ts
# Confirme que nenhuma função tem clienteId como parâmetro
```

### Hook (`hooks/useProfissionais.ts`)

- [ ] Interface não tem `clienteId` property
- [ ] `autoLoad` parameter existe
- [ ] `filtroAtivo` parameter existe
- [ ] `loadProfissionais()` não requer clienteId
- [ ] `search(term)` sem clienteId
- [ ] `create()`, `update()`, `remove()`, `toggleStatus()` implementados
- [ ] Hook chama `getProfissionaisCrud(filtroAtivo)` para carregar

**Como verificar:**

```bash
# Abra: alma4d-dashboard/hooks/useProfissionais.ts
# Verifique interface UseProfissionaisOptions
```

### Pages

#### `profissionais/page.tsx`

- [ ] Desestrutura `role` do useAuth (não `clienteId`)
- [ ] Hook inicializado com `useProfissionais({ autoLoad: true })`
- [ ] Search funciona sem clienteId
- [ ] Tabela mostra profissionais ou "Nenhum cadastrado"

**Como verificar:**

```bash
# Abra: alma4d-dashboard/app/dashboard/profissionais/page.tsx
# Linha ~12-13 deve ter: useProfissionais({ autoLoad: true })
```

#### `novo/page.tsx`

- [ ] Desestrutura `role` do useAuth (não `clienteId`)
- [ ] Hook inicializado com `useProfissionais({ autoLoad: false })`
- [ ] `handleSubmit` chama `create(data)` sem clienteId
- [ ] Redireciona para `/dashboard/profissionais` após criar

**Como verificar:**

```bash
# Abra: alma4d-dashboard/app/dashboard/profissionais/novo/page.tsx
# Deve ter: const { role, loading: authLoading } = useAuth();
# NÃO deve ter: const { clienteId, role } = useAuth();
```

#### `[id]/editar/page.tsx`

- [ ] Desestrutura `role` do useAuth (não `clienteId`)
- [ ] Hook inicializado com `useProfissionais({ autoLoad: false })`
- [ ] Carrega profissional por ID
- [ ] Form pré-preenchido com dados

**Como verificar:**

```bash
# Abra: alma4d-dashboard/app/dashboard/profissionais/[id]/editar/page.tsx
# Deve ter: const { role, loading: authLoading } = useAuth();
```

---

## 🧪 Testes Funcionais

### Setup Inicial

- [ ] `.env.local` tem NEXT_PUBLIC_SUPABASE_URL
- [ ] `.env.local` tem NEXT_PUBLIC_SUPABASE_ANON_KEY
- [ ] `npm run dev` executa sem erros
- [ ] Servidor roda em `localhost:3000`

### Teste 1: Listar Profissionais (GET)

```
URL: http://localhost:3000/dashboard/profissionais
Esperado:
  ✓ Página carrega
  ✓ Se vazio: "Nenhum profissional cadastrado"
  ✓ Se com dados: Tabela com colunas (Nome, Especialidade, Status, Ações)
```

- [ ] Página carrega sem erro
- [ ] Mensagem de carregamento desaparece
- [ ] Table ou "vazio" aparece

### Teste 2: Criar Profissional (POST)

```
URL: http://localhost:3000/dashboard/profissionais/novo
Dados:
  nome: "Dr. João Silva"
  especialidade: "Psicologia Clínica"
  documento: "12345678909"
  calendly_url: "https://calendly.com/joao"
  bio_resumida: "Especialista em terapia"
```

- [ ] Formulário carrega
- [ ] Validação funciona (tente enviar vazio)
- [ ] Após enviar, profissional aparece na listagem
- [ ] URL muda para `/dashboard/profissionais`

### Teste 3: Editar Profissional (PUT)

```
1. Clique em ✏️ (editar) em um profissional
2. Mude o nome para "Dr. João Silva Jr."
3. Clique em "Salvar"
```

- [ ] Form pré-preenchido com dados atuais
- [ ] Alteração salva
- [ ] Nome atualizado na listagem

### Teste 4: Alternar Status (PATCH)

```
1. Clique no badge de status (Ativo/Inativo)
2. Deve mudar imediatamente
3. Recarregue página - deve manter o novo status
```

- [ ] Status alterna em tempo real
- [ ] Persiste após recarregar

### Teste 5: Deletar Profissional (DELETE)

```
1. Clique em 🗑️ (lixeira)
2. Confirme no modal
3. Profissional deve desaparecer
```

- [ ] Modal de confirmação aparece
- [ ] Após confirmar, profissional desaparece
- [ ] Ao recarregar, não aparece

### Teste 6: Buscar Profissional (SEARCH)

```
1. Na listagem, digite "João" no campo de busca
2. Deve filtrar para mostrar apenas "João Silva"
```

- [ ] Campo de busca existe
- [ ] Filtra por nome em tempo real
- [ ] Limpar busca volta a mostrar todos

---

## 🐛 Testes de Erro

### Erro 1: Documento Duplicado

```
1. Crie profissional com documento "12345678909"
2. Tente criar outro com mesmo documento
Esperado: "Documento (CPF/CNPJ) já cadastrado"
```

- [ ] Erro é exibido de forma amigável
- [ ] Não trava a página

### Erro 2: Calendly URL Vazia

```
1. Tente criar profissional sem calendly_url
2. Deve rejitar na validação do formulário
```

- [ ] Campo de calendly_url é obrigatório
- [ ] Mensagem de erro clara

### Erro 3: Supabase Desconectado

```
1. Desligue internet ou bloqueie Supabase
2. Tente criar profissional
Esperado: Erro com opção de retry
```

- [ ] Erro é tratado gracefully
- [ ] Mensagem útil é exibida
- [ ] Não trava a aplicação

---

## 📊 Verificações de Schema

No Supabase Console, execute:

```sql
-- Verificar tabela
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profissionais';
```

Deve retornar:

- [ ] `id` (uuid, not nullable)
- [ ] `nome` (text, not nullable)
- [ ] `especialidade` (text, not nullable)
- [ ] `documento` (text, not nullable, UNIQUE)
- [ ] `calendly_url` (text, not nullable)
- [ ] `bio_resumida` (text, nullable)
- [ ] `foto_url` (text, nullable)
- [ ] `numero_conselho` (text, nullable)
- [ ] `website_url` (text, nullable)
- [ ] `linkedin_url` (text, nullable)
- [ ] `instagram_url` (text, nullable)
- [ ] `whatsapp_url` (text, nullable)
- [ ] `ativo` (boolean, default true)
- [ ] `created_at` (timestamp, default now())

```sql
-- Verificar índices
SELECT * FROM pg_indexes WHERE tablename = 'profissionais';
```

Deve ter:

- [ ] `profissionais_documento_unique` (único)

---

## 📝 Verificações de Documentação

- [ ] `QUICK-START.md` existe (5 minutos de setup)
- [ ] `TESTE-FASE2.md` existe (6 cenários de teste)
- [ ] `seed-profissionais.sql` existe (dados de teste)
- [ ] `FASE2-STATUS.md` existe (status completo)
- [ ] `ROADMAP.md` existe (Fases 3-9)
- [ ] `RESUMO-FINAL.md` existe (resumo)

---

## 🎯 Checklist Final

**CÓDIGO:**

- [ ] Service layer sem clienteId
- [ ] Hook simplificado
- [ ] Pages atualizadas
- [ ] TypeScript sem erros
- [ ] Imports corretos

**TESTES:**

- [ ] GET (listar) funciona
- [ ] POST (criar) funciona
- [ ] PUT (editar) funciona
- [ ] DELETE (deletar) funciona
- [ ] PATCH (toggle status) funciona
- [ ] SEARCH funciona
- [ ] Validações funcionam
- [ ] Erros tratados

**DOCUMENTAÇÃO:**

- [ ] 5 guias criados
- [ ] Exemplos incluídos
- [ ] Troubleshooting documentado
- [ ] Próximos passos claros

---

## 🚀 Status Final

**Fase 2 Completa?**

- [ ] Sim, tudo está funcionando!
- [ ] Não, encontrei erros (liste-os abaixo):

```
Erros encontrados:
1.
2.
3.
```

---

## 📞 Suporte

Se algo não funciona:

1. **Verifique .env.local** - 80% dos problemas
2. **Veja console.log em F12** - Mensagens de erro
3. **Leia TESTE-FASE2.md** - Troubleshooting
4. **Verifique schema Supabase** - Campos corretos?

---

**Data:** [Hoje]  
**Validador:** [Seu nome]  
**Status:** ✅ PRONTO OU ⚠️ EM PROGRESSO
