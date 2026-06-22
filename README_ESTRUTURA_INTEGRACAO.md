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
Este documento foi consolidado em [README_INTEGRACAO.md](README_INTEGRACAO.md).
Por favor consulte o arquivo central para a versão completa e atualizada da estrutura de integrações, padrões e roadmap.
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
