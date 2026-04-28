# 🚀 Quick Start - Alma4D Dashboard Fase 2

## ⚡ 5 Minutos para Começar

### 1️⃣ Instalar Dependências (se não feito)

```bash
cd alma4d-dashboard
npm install
```

### 2️⃣ Configurar Variáveis de Ambiente

```bash
# Copie .env.example para .env.local (se existir)
cp .env.example .env.local

# Ou crie .env.local com:
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_publica_aqui
```

**Onde encontrar?**

- URL: Supabase > Project Settings > API > Project URL
- Chave: Supabase > Project Settings > API > anon public

### 3️⃣ Iniciar Servidor Dev

```bash
npm run dev
```

Acesse: http://localhost:3000/dashboard/profissionais

### 4️⃣ Carregar Dados de Teste (Opcional)

No Supabase Console > SQL Editor:

```sql
-- Cole todo o conteúdo de seed-profissionais.sql
```

### 5️⃣ Testar CRUD

- **Listar:** Já deve funcionar (table vazia ou com dados)
- **Criar:** Clique em "+ Novo Profissional"
- **Editar:** Clique no ícone de editar (✏️)
- **Deletar:** Clique no ícone de lixeira (🗑️)

---

## 📍 Localizações Importantes

| O quê                     | Onde                                        |
| ------------------------- | ------------------------------------------- |
| Listagem de profissionais | `/dashboard/profissionais`                  |
| Criar novo                | `/dashboard/profissionais/novo`             |
| Editar profissional       | `/dashboard/profissionais/[id]/editar`      |
| Código de listagem        | `app/dashboard/profissionais/page.tsx`      |
| Form de criação/edição    | `components/dashboard/ProfessionalForm.tsx` |
| Serviços API              | `services/profissionais.ts`                 |
| Custom hook               | `hooks/useProfissionais.ts`                 |
| Tipos TypeScript          | `types/profissional.ts`                     |
| Supabase client           | `lib/supabase/client.ts`                    |

---

## 🧪 Testes Rápidos

### Teste 1: Listar (GET)

```
URL: http://localhost:3000/dashboard/profissionais
Esperado: Tabela com profissionais ou "Nenhum cadastrado"
```

### Teste 2: Criar (POST)

```
1. Clique em "+ Novo Profissional"
2. Preencha:
   - Nome: "Dr. João"
   - Especialidade: "Psicologia"
   - Documento: "12345678909" (CPF válido)
   - Calendly: "https://calendly.com/joao"
3. Clique em "Salvar"
4. Verifique se aparece na listagem
```

### Teste 3: Editar (PUT)

```
1. Clique no ícone de editar (✏️)
2. Modifique o nome
3. Clique em "Salvar"
4. Verifique alteração na listagem
```

### Teste 4: Deletar (DELETE)

```
1. Clique no ícone de lixeira (🗑️)
2. Confirme na caixa de diálogo
3. Verifique se desaparece da listagem
```

---

## 🐛 Troubleshooting Rápido

### ❌ "Cannot POST /auth/v1/token"

```bash
# Verifique em .env.local:
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co  # ✅ tem https://
```

### ❌ "Invalid API Key"

```bash
# Copie novamente a chave do Supabase:
NEXT_PUBLIC_SUPABASE_ANON_KEY=...  # ✅ chave correta
```

### ❌ "Documento (CPF/CNPJ) já cadastrado"

```
Isso é esperado! Significa que o documento já existe.
Use outro documento para testar.
```

### ❌ "Profissional não encontrado"

```
Verifique se o ID na URL existe no banco:
Supabase > profissionais > SELECT
```

### ❌ Servidor não inicia

```bash
# Limpe node_modules e instale novamente
rm -rf node_modules package-lock.json
npm install
npm run dev
```

---

## 🔗 Próximos Passos

1. **Ler a documentação completa** → [FASE2-STATUS.md](FASE2-STATUS.md)
2. **Executar testes** → [TESTE-FASE2.md](TESTE-FASE2.md)
3. **Ver roadmap** → [ROADMAP.md](ROADMAP.md)
4. **Começar Fase 3** → Features avançadas (CPF/CNPJ validation, upload de fotos, etc.)

---

## 💡 Dicas Pro

### Validação em Tempo Real

```typescript
// O formulário valida automaticamente enquanto você digita
// Veja: components/dashboard/ProfessionalForm.tsx
```

### Estado Global de Erro

```typescript
// Erro é mostrado automaticamente
// Veja as queries em Network tab (F12)
```

### Busca em Tempo Real

```typescript
// Digite no campo de busca e filtra por nome/especialidade
// Otimizado com debounce (veja: useProfissionais.ts)
```

### Desenvolvimento Local com Console

```bash
# F12 > Console para ver logs de erro
# F12 > Network > XHR para ver requisições ao Supabase
# F12 > Application > Local Storage para ver tokens
```

---

## 📚 Arquivos Essenciais

```
alma4d-dashboard/
├── app/
│   └── dashboard/
│       └── profissionais/
│           ├── page.tsx              ← Listagem
│           ├── novo/page.tsx         ← Criar
│           └── [id]/editar/page.tsx  ← Editar
├── components/dashboard/
│   └── ProfessionalForm.tsx          ← Form CRUD
├── hooks/
│   └── useProfissionais.ts           ← Logic de dados
├── services/
│   └── profissionais.ts              ← Chamadas Supabase
├── types/
│   └── profissional.ts               ← TypeScript types
├── lib/supabase/
│   ├── client.ts                     ← Browser client
│   └── server.ts                     ← Server client
└── FASE2-STATUS.md                   ← Status completo
```

---

## ✅ Checklist de Setup

- [ ] `.env.local` criado com URL e chave corretas
- [ ] `npm install` executado
- [ ] `npm run dev` funcionando
- [ ] `http://localhost:3000/dashboard/profissionais` acessível
- [ ] Dados carregados ou formulário vazio aparece
- [ ] Botão "+ Novo Profissional" funciona

---

## 📞 Suporte

Não está funcionando?

1. **Verifique `.env.local`** ← 80% dos problemas
2. **Veja F12 > Console** ← Mensagem de erro está lá
3. **Consulte TESTE-FASE2.md** ← Seção Troubleshooting
4. **Execute `npm run dev` novamente** ← às vezes ajuda

---

## 🎯 Status

- ✅ Fase 1 (Layout) - Pronto
- ✅ Fase 2 (CRUD) - **Pronto agora!**
- 🔄 Fase 3 (Features) - Próximo

Aproveite! 🚀

---

**Tempo estimado de setup:** 5 minutos  
**Tempo de primeiro teste:** 2 minutos  
**Tempo total:** 7 minutos
