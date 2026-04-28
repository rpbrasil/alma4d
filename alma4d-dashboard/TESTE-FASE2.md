# 🧪 Guia de Testes - Fase 2

## ✅ Setup Inicial

### 1. Configure as variáveis de ambiente

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=sua_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_aqui
```

### 2. Verifique a tabela no Supabase

```sql
SELECT * FROM profissionais LIMIT 1;
```

Deve retornar os campos:

- `id` (UUID)
- `nome` (TEXT)
- `especialidade` (TEXT)
- `documento` (TEXT) - CPF ou CNPJ
- `calendly_url` (TEXT)
- `bio_resumida` (TEXT nullable)
- `foto_url` (TEXT nullable)
- `website_url`, `linkedin_url`, `instagram_url`, `whatsapp_url` (TEXT nullable)
- `numero_conselho` (TEXT nullable)
- `ativo` (BOOLEAN, default true)
- `created_at` (TIMESTAMP)

---

## 🧪 Testes Manuais

### Teste 1: Listar Profissionais

**URL:** `http://localhost:3000/dashboard/profissionais`

**Esperado:**

- ✅ Página carrega sem erros
- ✅ Mostra "Nenhum profissional cadastrado" se vazio
- ✅ Mostra loading enquanto busca dados
- ✅ Se houver dados, exibe em tabela

**Se falhar:**

```bash
# Verifique:
1. .env.local está correto
2. Tabela existe no Supabase
3. Abra DevTools (F12) e veja os erros no console
4. Verifique Network tab para ver requisição ao Supabase
```

---

### Teste 2: Criar Profissional

**URL:** `http://localhost:3000/dashboard/profissionais/novo`

**Dados de Teste:**

```json
{
  "nome": "Dr. João Silva",
  "especialidade": "Psicologia Clínica",
  "documento": "12345678901",
  "calendly_url": "https://calendly.com/joao",
  "bio_resumida": "Especialista em terapia cognitiva",
  "foto_url": "https://via.placeholder.com/150",
  "website_url": "https://joaosilva.com",
  "linkedin_url": "https://linkedin.com/in/joao",
  "instagram_url": "https://instagram.com/joao",
  "whatsapp_url": "https://wa.me/5511999999999",
  "numero_conselho": "12345/SP"
}
```

**Esperado:**

- ✅ Formulário carrega
- ✅ Validações funcionam (tente enviar sem Nome)
- ✅ Ao enviar, mostra sucesso
- ✅ Redireciona para listagem
- ✅ Novo profissional aparece na lista

**Validações a testar:**

- Sem "Nome" → erro "deve ter pelo menos 3 caracteres"
- Sem "Especialidade" → erro "Especialidade é obrigatória"
- Sem "Documento" → erro "Documento é obrigatório"
- Sem "Calendly" → erro "URL inválida"
- URL inválida em "Website" → erro "URL inválida"
- CPF inválido → erro "CPF inválido" (se implementado)

---

### Teste 3: Editar Profissional

**URL:** `http://localhost:3000/dashboard/profissionais/[id]/editar`

**Passos:**

1. Clique no ícone de editar em um profissional da listagem
2. Modifique o nome ou especialidade
3. Clique em "Salvar"

**Esperado:**

- ✅ Formulário pré-preenchido com dados atuais
- ✅ Alterações são salvas
- ✅ Volta para listagem atualizada

---

### Teste 4: Alternar Status (Ativo/Inativo)

**Passos:**

1. Na listagem, clique no badge de status (Ativo/Inativo)

**Esperado:**

- ✅ Status muda imediatamente na tabela
- ✅ Banco de dados atualiza
- ✅ Ao recarregar, status permanece

---

### Teste 5: Deletar Profissional

**Passos:**

1. Na listagem, clique no ícone de lixeira
2. Confirme na caixa de diálogo

**Esperado:**

- ✅ Profissional desaparece da lista (soft delete)
- ✅ Campo `ativo` vira `false` no banco
- ✅ Ao recarregar, não aparece (se filtro estiver ativo)

---

### Teste 6: Buscar Profissional

**Passos:**

1. Na listagem, digite no campo de busca
2. Por exemplo: "João"

**Esperado:**

- ✅ Filtra profissionais que contêm "João" no nome
- ✅ Também busca por especialidade
- ✅ Busca é em tempo real

---

## 🐛 Troubleshooting

### Erro: "Cannot POST /auth/v1/token"

**Causa:** URL do Supabase inválida

```bash
# Verifique em .env.local:
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co  # Não esqueça https://
```

### Erro: "Invalid API Key"

**Causa:** Chave anônima inválida

```bash
# Verifique em Settings > API no Supabase:
# Copie exatamente: anon public
```

### Erro: "Documento já cadastrado"

**Causa:** CPF/CNPJ já existe no banco

```bash
# Use um documento diferente nos testes
```

### Erro: "Profissional não encontrado"

**Causa:** ID da URL está errado

```bash
# Verifique:
# - ID existe no banco
# - Não digitou errado na URL
```

---

## 📊 Verificações no Supabase Console

### Ver todos os profissionais:

```sql
SELECT id, nome, especialidade, ativo, created_at FROM profissionais ORDER BY created_at DESC;
```

### Ver apenas ativos:

```sql
SELECT * FROM profissionais WHERE ativo = true;
```

### Ver profissional por documento:

```sql
SELECT * FROM profissionais WHERE documento = '12345678901';
```

### Deletar todos para teste limpo:

```sql
DELETE FROM profissionais;
-- Ou resetar sequência de IDs:
TRUNCATE profissionais CASCADE;
```

---

## ✨ Checklist de Testes Concluído

- [ ] Listar profissionais (vazio)
- [ ] Criar primeiro profissional
- [ ] Listar profissionais (com dados)
- [ ] Editar profissional
- [ ] Alternar status
- [ ] Deletar profissional
- [ ] Buscar por nome
- [ ] Validações de formulário
- [ ] Erros tratados corretamente
- [ ] Dados persistem após recarregar página

---

## 🚀 Próximas Etapas

Após testes bem-sucedidos:

1. ✅ Integração com Supabase completa
2. 🔄 Adicionar mais validações (CPF/CNPJ algorítmicas)
3. 🔄 Implementar paginação para muitos registros
4. 🔄 Adicionar filtros avançados
5. 🔄 Exportação de dados (CSV, PDF)
