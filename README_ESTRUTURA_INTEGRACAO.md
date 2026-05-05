# 📐 Estrutura de Integrações - alma4D Dashboard

## 🎯 Princípios de Organização

```
app/
├── (public)/              # Páginas públicas (sem autenticação)
│   ├── layout.tsx         # Layout público
│   ├── page.tsx           # Home
│   ├── autora/
│   ├── cliente/
│   ├── contato/
│   ├── livro/
│   ├── lancamento/
│   ├── download/
│   ├── privacidade/
│   └── termos/
│
├── dashboard/             # Páginas autenticadas (pós-login)
│   ├── layout.tsx         # Layout dashboard (sidebar + header)
│   ├── page.tsx           # Dashboard Home ✅
│   ├── profissionais/     # CRUD profissionais
│   ├── relatorios/        # Relatórios e analytics
│   ├── usuarios/          # Gerenciamento de usuários
│   └── configuracoes/     # Configurações
│
├── components/            # Componentes COMPARTILHADOS
│   ├── public/            # Componentes apenas do (public)
│   ├── dashboard/         # Componentes apenas do dashboard
│   └── shared/            # Componentes usados em ambos
│
├── services/              # Serviços (NOVO PADRÃO)
│   ├── shared/            # Serviços compartilhados
│   │   ├── auth.ts        # Autenticação
│   │   └── user.ts        # Dados do usuário
│   ├── public/            # Serviços específicos do (public)
│   └── dashboard/         # Serviços específicos do dashboard
│       ├── profissionais.ts    # ✅ Já criado
│       ├── dashboard.ts        # ✅ Já criado
│       └── relatorios.ts       # A criar
│
├── hooks/                 # Hooks customizados
│   ├── useAuth.ts         # ✅ Autenticação global
│   ├── useProfissionais.ts    # ✅ Dashboard
│   ├── useDashboardData.ts    # ✅ Dashboard
│   └── ...                # Outros por contexto
│
├── types/                 # Types/Interfaces centralizadas
│   ├── global.d.ts        # Tipos globais
│   ├── profissional.ts    # ✅ Profissional
│   └── ...                # Outros types
│
├── context/               # Context API
│   ├── auth.tsx           # ✅ Autenticação
│   └── ...                # Outros contexts
│
└── lib/                   # Utilidades
    ├── supabase/          # Supabase client
    └── utils/             # Funções utilitárias
```

---

## 📦 Proposta de Organização por Camada

### **1. CAMADA DE CONTEXT (Shared - Autenticação)**

```typescript
// ✅ EXISTENTE: context/auth.tsx
// ✅ Já implementado com:
// - user, session, userId, role, clienteId, gestorId
// - loading, blocked, signOut, refreshUser
// Uso: const { user, role } = useAuth()
```

**Status:** ✅ Pronto para uso em ambos (public) e dashboard

---

### **2. CAMADA DE SERVICES**

#### **A) Services Compartilhados (Shared)**

```typescript
// lib/services/shared/auth.ts
// - Funções de autenticação (sign-in, sign-up, sign-out)
// - Verificação de permissões
// - Validação de tokens

// lib/services/shared/user.ts
// - getPerfil()
// - updatePerfil(data)
// - changePassword()
```

#### **B) Services do Dashboard**

```typescript
// ✅ services/profissionais.ts     - CRUD profissionais
// ✅ services/dashboard.ts         - Métricas e analytics
// services/relatorios.ts           - Relatórios
// services/usuarios.ts             - Gerenciamento de usuários
```

#### **C) Services do (Public)**

```typescript
// services/public/livro.ts         - Dados de livros
// services/public/lancamento.ts    - Lançamentos
// services/public/contato.ts       - Contatos/enquiries
```

---

### **3. CAMADA DE HOOKS**

#### **Hooks Globais (Usáveis em qualquer lugar)**

```typescript
// ✅ hooks/useAuth.ts
// Uso: const { user, role } = useAuth()
// Disponível: (public) e dashboard

// hooks/useLocalStorage.ts
// Uso: const [value, setValue] = useLocalStorage('key', defaultValue)
```

#### **Hooks de Dashboard**

```typescript
// ✅ hooks/useProfissionais.ts
// Uso: const { profissionais, loading, create, update } = useProfissionais()

// ✅ hooks/useDashboardData.ts
// Uso: const { metrics, activities, especialidades } = useDashboardData()

// hooks/useRelatorios.ts    (A criar)
// Uso: const { relatorios, gerarRelatorio } = useRelatorios()
```

---

### **4. CAMADA DE COMPONENTS**

#### **Componentes Compartilhados (shared/)**

```
components/shared/
├── Button.tsx           # ✅ Botão padrão
├── Icon.tsx             # ✅ Ícones
├── MetodoModal.tsx      # ✅ Modal genérico
├── ThemeToggle.tsx      # ✅ Toggle tema
└── common/
    ├── Header.tsx       # Header simples
    ├── Footer.tsx       # Footer
    └── Loading.tsx      # Spinner genérico
```

#### **Componentes do (Public)**

```
components/public/
├── Hero.tsx             # Seção hero
├── Features.tsx         # Features list
├── Navbar.tsx           # Navbar público
├── Newsletter.tsx       # Newsletter signup
└── PdfCarousel.tsx      # ✅ Já existe
```

#### **Componentes do Dashboard**

```
components/dashboard/
├── Sidebar.tsx          # ✅ Já existe
├── Header.tsx           # ✅ Header autenticado
├── ProfessionalForm.tsx # ✅ Já existe
├── ProfessionalTable.tsx
├── ProfessionalCard.tsx
├── DashboardCard.tsx
├── MetricsGrid.tsx
└── Charts/
    ├── LineChart.tsx
    ├── BarChart.tsx
    └── PieChart.tsx
```

---

### **5. CAMADA DE TYPES**

```typescript
// types/global.d.ts
// - Tipos globais compartilhados
// - Tipos de usuário, autenticação

// types/profissional.ts ✅
// - Interface Profissional
// - Validadores (isCPFValido, etc)

// types/relatorio.ts
// - Interface Relatorio
// - Tipos de métricas

// types/public.ts
// - Tipos específicos de (public)
// - Livro, Lancamento, etc
```

---

## 🔌 Padrões de Integração

### **Padrão 1: Página Pública com Dados (Exemplo)**

```typescript
// app/(public)/livro/page.tsx
"use client";
import { getLivros } from "@/services/public/livro";
import { LivroCard } from "@/components/public/LivroCard";

export default function LivroPage() {
  const [livros, setLivros] = useState([]);

  useEffect(() => {
    getLivros().then(setLivros);
  }, []);

  return (
    <div>
      {livros.map(livro => (
        <LivroCard key={livro.id} livro={livro} />
      ))}
    </div>
  );
}
```

### **Padrão 2: Página Dashboard Autenticada (Exemplo)**

```typescript
// app/dashboard/profissionais/page.tsx ✅
"use client";
import { useAuth } from "@/context/auth";
import { useProfissionais } from "@/hooks/useProfissionais";
import { ProfessionalTable } from "@/components/dashboard/ProfessionalTable";

export default function ProfissionaisPage() {
  const { user } = useAuth(); // Garante autenticação
  const { profissionais, loading } = useProfissionais({ autoLoad: true });

  return (
    <div>
      <ProfessionalTable profissionais={profissionais} />
    </div>
  );
}
```

### **Padrão 3: Hook Customizado Reutilizável**

```typescript
// hooks/usePaginacao.ts (NOVO - Para ambos os contextos)
export function usePaginacao<T>(items: T[], itemsPerPage = 10) {
  const [currentPage, setCurrentPage] = useState(1);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return items.slice(start, start + itemsPerPage);
  }, [items, currentPage, itemsPerPage]);

  return {
    paginatedItems,
    currentPage,
    totalPages: Math.ceil(items.length / itemsPerPage),
    setCurrentPage,
  };
}

// Uso em Dashboard
const { paginatedItems: profissionaisPaginados } = usePaginacao(
  profissionais,
  20,
);

// Uso em Public
const { paginatedItems: livrosPaginados } = usePaginacao(livros, 12);
```

---

## 🎯 Roadmap de Integrações (Prioridade)

### **FASE 1: Consolidação (Semana 1)** ✅ PARCIAL

- [x] Context API para autenticação (`useAuth`)
- [x] Services de profissionais (`services/profissionais.ts`)
- [x] Dashboard analytics (`services/dashboard.ts`)
- [x] Hooks de data (`useProfissionais`, `useDashboardData`)
- [ ] **Próximo:** Reorganizar componentes em públicos/dashboard/shared

### **FASE 2: Estruturação de Componentes (Semana 2)**

- [ ] Separar `components/` em públicos/dashboard/shared
- [ ] Criar `components/public/` para páginas de (public)
- [ ] Criar `components/dashboard/` para todas as subpáginas
- [ ] Mover `PdfCarousel.tsx` → `components/public/`
- [ ] Criar `ProfessionalTable.tsx` e `ProfessionalCard.tsx`

### **FASE 3: Serviços Modulares (Semana 3)**

- [ ] Criar estrutura `services/public/`
- [ ] Criar `services/shared/`
- [ ] Mover lógica comum para shared
- [ ] Services de relatórios
- [ ] Services de usuários

### **FASE 4: Hooks Reutilizáveis (Semana 4)**

- [ ] `useForm.ts` - Wrapper para react-hook-form + Zod
- [ ] `usePaginacao.ts` - Paginação genérica
- [ ] `useFetch.ts` - Chamadas HTTP
- [ ] `useDebounce.ts` - Debounce para search
- [ ] `useAsync.ts` - Gerenciamento de async state

### **FASE 5: Dashboard Avançado (Semana 5)**

- [ ] Relatórios com gráficos (Recharts)
- [ ] Export de dados (CSV, PDF)
- [ ] Filtros avançados
- [ ] Paginação com infinite scroll
- [ ] Notificações em tempo real (WebSocket)

---

## 📋 Checklist de Organização

```markdown
## Componentes

- [x] Button.tsx (shared)
- [x] Icon.tsx (shared)
- [x] ThemeToggle.tsx (shared)
- [x] PdfCarousel.tsx → mover para public/
- [x] MetodoModal.tsx (shared)
- [x] Sidebar.tsx (dashboard)
- [x] Header.tsx (dashboard)
- [x] ProfessionalForm.tsx (dashboard)
- [ ] ProfessionalTable.tsx (dashboard)
- [ ] ProfessionalCard.tsx (dashboard)
- [ ] LivroCard.tsx (public)
- [ ] HeroSection.tsx (public)

## Services

- [x] profissionais.ts (dashboard)
- [x] dashboard.ts (dashboard analytics)
- [ ] relatorios.ts (dashboard)
- [ ] usuarios.ts (dashboard)
- [ ] livro.ts (public)
- [ ] contato.ts (public)
- [ ] Reorganizar em services/dashboard/
- [ ] Criar services/public/
- [ ] Criar services/shared/

## Hooks

- [x] useAuth.ts (shared)
- [x] useProfissionais.ts (dashboard)
- [x] useDashboardData.ts (dashboard)
- [ ] useForm.ts (shared)
- [ ] usePaginacao.ts (shared)
- [ ] useDebounce.ts (shared)
- [ ] useFetch.ts (shared)

## Types

- [x] global.d.ts
- [x] profissional.ts
- [ ] relatorio.ts
- [ ] livro.ts
- [ ] usuario.ts
```

---

## 🔗 Exemplo de Integração Completa

### Cenário: Criar Nova Página de "Meus Relatórios" no Dashboard

**1. Type** → `types/relatorio.ts`

```typescript
export interface Relatorio {
  id: string;
  titulo: string;
  descricao: string;
  tipo: "pdf" | "excel" | "csv";
  criado_em: string;
  tamanho: number;
}
```

**2. Service** → `services/dashboard/relatorios.ts`

```typescript
export async function getRelatorios() {
  return supabase
    .from("relatorios")
    .select("*")
    .order("criado_em", { ascending: false });
}
```

**3. Hook** → `hooks/useRelatorios.ts`

```typescript
export function useRelatorios() {
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);

  useEffect(() => {
    getRelatorios().then((r) => setRelatorios(r.data || []));
  }, []);

  return { relatorios, loading };
}
```

**4. Component** → `components/dashboard/RelatoriTable.tsx`

```typescript
export function RelatorioTable({ relatorios }: { relatorios: Relatorio[] }) {
  return (
    <table>
      {relatorios.map(r => (
        <tr key={r.id}>
          <td>{r.titulo}</td>
          <td>{r.tipo}</td>
          <td>{r.criado_em}</td>
        </tr>
      ))}
    </table>
  );
}
```

**5. Page** → `app/dashboard/relatorios/page.tsx`

```typescript
"use client";
import { useAuth } from "@/context/auth";
import { useRelatorios } from "@/hooks/useRelatorios";
import { RelatorioTable } from "@/components/dashboard/RelatorioTable";

export default function RelatoriosPage() {
  const { user } = useAuth();
  const { relatorios } = useRelatorios();

  return (
    <div>
      <h1>Meus Relatórios</h1>
      <RelatorioTable relatorios={relatorios} />
    </div>
  );
}
```

---

## ✅ Status Atual

| Componente                       | Status         | Localização                 |
| -------------------------------- | -------------- | --------------------------- |
| Auth Context                     | ✅ Completo    | `context/auth.tsx`          |
| Services Profissionais           | ✅ Completo    | `services/profissionais.ts` |
| Dashboard Service                | ✅ Completo    | `services/dashboard.ts`     |
| useProfissionais Hook            | ✅ Completo    | `hooks/useProfissionais.ts` |
| useDashboardData Hook            | ✅ Completo    | `hooks/useDashboardData.ts` |
| Dashboard Page                   | ✅ Redesenhado | `app/dashboard/page.tsx`    |
| Separação Public/Dashboard       | ✅ Existe      | estrutura de pastas         |
| **Reorganização de Componentes** | ❌ Pendente    | Próximo passo               |
| Services Modularizados           | ❌ Pendente    | Próximo passo               |
| Relatórios com Gráficos          | ❌ Pendente    | Fase 5                      |

---

## 🚀 Próximas Ações Propostas

1. **Reorganizar componentes** em `public/`, `dashboard/`, `shared/`
2. **Criar estrutura** de `services/` com subpastas
3. **Implementar novos hooks** (useForm, usePaginacao, etc)
4. **Desenvolver página** de relatórios
5. **Adicionar gráficos** com Recharts

Qual dessas áreas você quer que a gente comece?
