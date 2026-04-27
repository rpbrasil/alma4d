# Alma4D Dashboard - Cliente

Dashboard moderno e prático para gestão de tenant no Alma4D.

## Configuração

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Copiar `.env.local.example` para `.env.local` e preenchercredenciais do Supabase

### 3. Rodar localmente

```bash
npm run dev
```

Abrir http://localhost:3000

## Estrutura do Projeto

- `app/` - Rotas e layout principal (Next.js App Router)
- `components/` - Componentes reutilizáveis
- `lib/` - Utilidades e clientes (Supabase, API)
- `hooks/` - Custom hooks para dados
- `types/` - Tipos TypeScript
- `services/` - Chamadas à API/edge functions

## Features

### Dashboard Home

- KPIs principais (plano, usuários, profissionais, COPSOQ)
- Gráficos e estatísticas
- Alertas
- Atalhos rápidos

### Gerenciar Usuários

- Listar, criar, editar, deletar usuários
- Filtros e busca
- Ativar/desativar usuários
- Assign roles e departamentos

### Gerenciar Profissionais

- Listar, criar, editar, deletar profissionais
- Upload de foto
- Links sociais e de calendário

### Relatórios COPSOQ

- Visualizar resultados de pesquisas
- Gráficos de comparação
- Drill-down por departamento/setor
- Exportar em PDF

### Configurações

- Perfil do tenant
- Notificações
- Departamentos e setores
- Auditoria

## Tecnologias

- **Next.js 15**: Framework React
- **Supabase**: Backend e autenticação
- **Tailwind CSS**: Styling
- **React Query**: Gerenciamento de dados
- **React Hook Form**: Formulários
- **Recharts**: Gráficos
- **TypeScript**: Type safety

## Fluxo de Autenticação

1. Usuário faz login em alma4d.com.br (OTP)
2. Redirect para dashboard
3. Middleware valida token JWT
4. Verifica role = "cliente"
5. Se válido, carrega dados do tenant

## Deployment

### Vercel (Recomendado)

```bash
vercel
```

### Docker

```bash
docker build -t alma4d-dashboard .
docker run -p 3000:3000 alma4d-dashboard
```

## Support

Para suporte, abra uma issue no repositório.
