# 🚀 Alma4D Dashboard - Fase 2: Integração Supabase

## ✅ O que foi criado

### **Camada de Serviços**

- `services/profissionais.ts` - CRUD completo com tratamento de erros
  - `getProfissionaisAtivos()` - Listar profissionais ativos
  - `getProfissionaisCrud()` - Listar todos (ativo + inativo)
  - `getProfissionalById()` - Buscar por ID
  - `createProfissional()` - Criar novo
  - `updateProfissional()` - Atualizar
  - `deleteProfissional()` - Soft delete
  - `toggleProfissionalStatus()` - Ativar/inativar
  - `searchProfissionais()` - Buscar por texto

### **Hooks Customizados**

- `hooks/useProfissionais.ts` - Hook de estado + dados
  - Auto-load de dados
  - Busca em tempo real
  - Tratamento de loading/error
  - Métodos: `create`, `update`, `remove`, `toggleStatus`, `search`

### **Componentes**

- `components/dashboard/ProfessionalForm.tsx` - Form com validação Zod
  - Validação de campos obrigatórios
  - URLs validation
  - Tratamento de erros
  - States de loading e sucesso

### **Páginas**

- `/dashboard/profissionais` - Listagem com busca + filtro status
- `/dashboard/profissionais/novo` - Criar profissional
- `/dashboard/profissionais/[id]/editar` - Editar profissional

---

## 🔧 Configuração

### 1. **Variáveis de Ambiente**

Copie `.env.local.example` para `.env.local`:

```bash
cp .env.local.example .env.local
```

Preencha com suas credenciais Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima
```

### 2. **Tabela no Supabase**

Crie a tabela `profissionais` com RLS (Row Level Security):

```sql
CREATE TABLE profissionais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  nome VARCHAR(200) NOT NULL,
  especialidade VARCHAR(100) NOT NULL,
  bio_resumida TEXT,
  foto_url TEXT,
  calendly_url TEXT,
  website_url TEXT,
  linkedin_url TEXT,
  instagram_url TEXT,
  whatsapp_url TEXT,
  cpf_cnpj VARCHAR(20),
  ativo BOOLEAN DEFAULT true,
  ordem INT,
  destaque BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  UNIQUE(cliente_id, cpf_cnpj),
  CONSTRAINT valid_urls CHECK (
    (foto_url IS NULL OR foto_url LIKE 'http%') AND
    (calendly_url IS NULL OR calendly_url LIKE 'http%') AND
    (website_url IS NULL OR website_url LIKE 'http%') AND
    (linkedin_url IS NULL OR linkedin_url LIKE 'http%') AND
    (instagram_url IS NULL OR instagram_url LIKE 'http%')
  )
);

-- Índices para performance
CREATE INDEX idx_profissionais_cliente ON profissionais(cliente_id);
CREATE INDEX idx_profissionais_ativo ON profissionais(ativo);
CREATE INDEX idx_profissionais_nome ON profissionais(nome);
```

### 3. **Row Level Security (RLS)**

Ative RLS na tabela e crie políticas:

```sql
-- Política de SELECT: usuários veem apenas profissionais do seu cliente
CREATE POLICY "profissionais_select" ON profissionais
  FOR SELECT USING (
    cliente_id = (SELECT cliente_id FROM usuarios WHERE id = auth.uid())
  );

-- Política de INSERT: apenas clientes e admins podem criar
CREATE POLICY "profissionais_insert" ON profissionais
  FOR INSERT WITH CHECK (
    (SELECT role FROM usuarios WHERE id = auth.uid()) IN ('cliente', 'admin')
  );

-- Política de UPDATE: apenas clientes e admins do mesmo cliente
CREATE POLICY "profissionais_update" ON profissionais
  FOR UPDATE USING (
    cliente_id = (SELECT cliente_id FROM usuarios WHERE id = auth.uid())
    AND (SELECT role FROM usuarios WHERE id = auth.uid()) IN ('cliente', 'admin')
  );

-- Política de DELETE: apenas admins (soft delete)
CREATE POLICY "profissionais_delete" ON profissionais
  FOR DELETE USING (
    (SELECT role FROM usuarios WHERE id = auth.uid()) = 'admin'
  );
```

---

## 📖 Como Usar

### **Listar Profissionais com Hook**

```tsx
"use client";

import { useProfissionais } from "@/hooks/useProfissionais";
import { useAuth } from "@/context/auth";

export function MeuComponente() {
  const { clienteId } = useAuth();
  const { profissionais, loading, error } = useProfissionais({
    clienteId,
    autoLoad: true,
  });

  if (loading) return <p>Carregando...</p>;
  if (error) return <p>Erro: {error}</p>;

  return (
    <ul>
      {profissionais.map((prof) => (
        <li key={prof.id}>{prof.nome}</li>
      ))}
    </ul>
  );
}
```

### **Criar Profissional**

```tsx
const { create, loading } = useProfissionais({ clienteId });

const handleSubmit = async (formData) => {
  try {
    const newProf = await create(formData);
    console.log("Criado:", newProf);
  } catch (err) {
    console.error("Erro:", err.message);
  }
};
```

### **Usar Serviço Diretamente**

```tsx
import {
  getProfissionaisCrud,
  createProfissional,
} from "@/services/profissionais";

// Buscar
const profissionais = await getProfissionaisCrud("cliente-id-aqui");

// Criar
const novo = await createProfissional({
  nome: "Dr. João",
  especialidade: "Psicologia",
  cliente_id: "cliente-id-aqui",
});

// Buscar por ID
const prof = await getProfissionalById("prof-id-aqui");
```

---

## 🎨 Validação com Zod

O form usa validação automática com Zod:

```tsx
const profissionalSchema = z.object({
  nome: z.string().min(3, "Mínimo 3 caracteres").max(200),
  especialidade: z.string().min(2).max(100),
  bio_resumida: z.string().max(500).optional().or(z.literal("")),
  foto_url: z.string().url("URL inválida").optional().or(z.literal("")),
  // ... mais campos
});
```

---

## ⚠️ Tratamento de Erros

Os serviços lançam erros amigáveis:

```tsx
- "CPF/CNPJ já cadastrado" (violação de unique constraint)
- "Você não tem permissão..." (RLS violation)
- "Profissional não encontrado"
```

---

## 🔐 Segurança

✅ **RLS ativado** - Dados isolados por cliente
✅ **Validação no client** - Zod schema
✅ **Soft delete** - Registros nunca são apagados (ativo = false)
✅ **Auth context** - Usuário sempre autenticado
✅ **Roles-based** - Permissões por papel (admin, cliente, gestor)

---

## 🚀 Próximas Fases

**Fase 3: Relatórios & Gráficos**

- Dashboard com métricas
- Gráficos com Recharts
- Exportação de dados (PDF, CSV)

**Fase 4: Usuários & Permissões**

- Gerenciamento de usuários
- RBAC (Role-Based Access Control)
- Auditoria de ações

**Fase 5: Configurações**

- Customização de branding
- Integrações
- Webhooks
