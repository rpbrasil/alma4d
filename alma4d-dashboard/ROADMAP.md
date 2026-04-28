# 🗺️ Roadmap Alma4D Dashboard

## Fases Concluídas ✅

### Fase 1: Layout & Navigation ✅

- [x] Estrutura base Next.js com App Router
- [x] Layout responsivo com Sidebar + Header
- [x] Sistema de navegação com active states
- [x] Role-based menu items (admin, cliente, gestor)
- [x] Context API para autenticação
- [x] Temas claro/escuro (preparado)

**Status:** ✅ Pronto para uso | **Tempo:** ~2-3h

---

### Fase 2: Supabase Integration & CRUD ✅

- [x] Schema alignment com banco real
- [x] Service layer (getProfissionais\*, createProfissional, etc.)
- [x] Custom hooks (useProfissionais)
- [x] Form validation com Zod
- [x] CRUD operations (Create, Read, Update, Delete)
- [x] Search functionality
- [x] Status toggle
- [x] Error handling com mensagens amigáveis
- [x] Documentação e guia de testes

**Status:** ✅ Pronto para QA | **Tempo:** ~4-5h | **Data:** [Hoje]

---

## Fases Planejadas 🔄

### Fase 3: Advanced Features & UI Polish

**Estimado:** 1-2 semanas

#### 3.1 - Validações CPF/CNPJ

- [ ] Algoritmo de validação oficial para CPF
- [ ] Algoritmo de validação oficial para CNPJ
- [ ] Máscara de entrada (11 ou 14 dígitos)
- [ ] Feedback visual em tempo real
- [ ] Testes unitários para validadores

#### 3.2 - Upload de Fotos

- [ ] Integração com Supabase Storage
- [ ] Crop/resize de imagem no cliente
- [ ] Preview antes de enviar
- [ ] Fallback para avatar padrão
- [ ] Otimização de tamanho/formato

#### 3.3 - UI Enhancements

- [ ] Paginação na listagem
- [ ] Ordenação por colunas
- [ ] Filtros avançados (especialidade, status)
- [ ] Busca global com autocomplete
- [ ] Animações de transição
- [ ] Toast notifications (não apenas console)

#### 3.4 - Performance

- [ ] Query caching com React Query
- [ ] Lazy loading de imagens
- [ ] Code splitting de rotas
- [ ] Database query optimization

---

### Fase 4: Relatórios & Analytics

**Estimado:** 1 semana

- [ ] Dashboard com métricas (total profissionais, ativos, etc.)
- [ ] Gráficos por especialidade
- [ ] Exportação CSV
- [ ] Exportação PDF com logo Alma4D
- [ ] Relatórios agendados por email

---

### Fase 5: Autenticação & Autorização

**Estimado:** 1-2 semanas

#### 5.1 - Row Level Security (RLS)

- [ ] Policies para diferentes roles
- [ ] Isolamento de dados por cliente
- [ ] Audit log de alterações
- [ ] Soft delete com timestamp

#### 5.2 - Gestão de Usuários

- [ ] CRUD de usuários do dashboard
- [ ] Atribuição de roles
- [ ] Dois fatores (2FA)
- [ ] Controle de sessões ativas

---

### Fase 6: Testes & QA

**Estimado:** 1-2 semanas

#### 6.1 - Testes Unitários

- [ ] Validadores (CPF, CNPJ)
- [ ] Service layer
- [ ] Hooks customizados
- [ ] Utilitários de formatação

#### 6.2 - Testes de Integração

- [ ] CRUD com Supabase real
- [ ] Autenticação e autorização
- [ ] Error scenarios
- [ ] Edge cases

#### 6.3 - E2E com Playwright/Cypress

- [ ] Flow completo de criar profissional
- [ ] Flow de editar profissional
- [ ] Flow de deletar profissional
- [ ] Busca e filtros
- [ ] Responsividade mobile

#### 6.4 - Performance Tests

- [ ] Lighthouse scores
- [ ] Load testing com k6
- [ ] Bundle size analysis

---

### Fase 7: Deploy & Monitoring

**Estimado:** 3-5 dias

#### 7.1 - CI/CD

- [ ] GitHub Actions para build
- [ ] Lint + type check + tests automáticos
- [ ] Deploy automático em staging
- [ ] Deploy manual em produção

#### 7.2 - Monitoring

- [ ] Sentry para error tracking
- [ ] LogRocket para session replay
- [ ] Datadog/New Relic para performance
- [ ] Uptime monitoring

#### 7.3 - Deploy Infrastructure

- [ ] Vercel ou similar
- [ ] Supabase em produção
- [ ] CDN para assets estáticos
- [ ] Backup strategy

---

### Fase 8: Integração com Módulos Existentes

**Estimado:** 1-2 semanas

- [ ] Integração com sistema de livros
- [ ] Integração com sistema de autorização
- [ ] Integração com sistema de pagamentos
- [ ] Integração com WhatsApp/Email
- [ ] Webhooks Supabase para notificações

---

### Fase 9: Admin Dashboard Completo

**Estimado:** 2-3 semanas

#### 9.1 - Gestão de Dados

- [ ] Gerenciar especialidades (CRUD)
- [ ] Gerenciar conselhos profissionais
- [ ] Bulk upload de profissionais (CSV)
- [ ] Validação em massa

#### 9.2 - Configurações

- [ ] Temas customizáveis
- [ ] Idiomas (i18n)
- [ ] Permissões granulares
- [ ] Backup & restore

#### 9.3 - Monitoring Admin

- [ ] Activity logs
- [ ] User activity heatmap
- [ ] Database query performance
- [ ] Storage usage

---

## Timeline Estimada

```
┌─ Fase 1 (Layout)           ✅ DONE     █████
├─ Fase 2 (CRUD)             ✅ DONE     █████
├─ Fase 3 (Advanced UI)      🔄 Q1       ███░░ (2 semanas)
├─ Fase 4 (Relatórios)       ⏳ Q1       ░░░░░ (1 semana)
├─ Fase 5 (Auth/RLS)         ⏳ Q1/Q2    ░░░░░ (1-2 semanas)
├─ Fase 6 (Testes)           ⏳ Q2       ░░░░░ (1-2 semanas)
├─ Fase 7 (Deploy)           ⏳ Q2       ░░░░░ (3-5 dias)
├─ Fase 8 (Integração)       ⏳ Q2/Q3    ░░░░░ (1-2 semanas)
└─ Fase 9 (Admin Completo)   ⏳ Q3       ░░░░░ (2-3 semanas)

Total Estimado: 8-12 semanas de desenvolvimento
```

---

## Stack Tecnológico

### Frontend

- **Next.js 15** - React framework full-stack
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **React Hook Form** - Form management
- **Zod** - Validation
- **React Query** (planejado) - Data fetching

### Backend

- **Supabase** - PostgreSQL + Real-time
- **Node.js/Deno** - Edge functions
- **PostgREST** - API automática

### DevOps

- **Vercel** - Hosting (planejado)
- **GitHub Actions** - CI/CD
- **Sentry** - Error monitoring
- **Docker** (opcional)

### Testes

- **Jest** - Unit tests
- **Playwright/Cypress** - E2E tests
- **k6** - Load testing

---

## Métricas de Sucesso

### Performance

- [ ] Core Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1
- [ ] Bundle size < 200KB (gzipped)
- [ ] TTI < 3s
- [ ] 90+ Lighthouse score

### Qualidade

- [ ] 80%+ test coverage
- [ ] 0 console errors em QA
- [ ] 0 type errors
- [ ] Acessibilidade WCAG AA

### Negócio

- [ ] Dashboard operacional
- [ ] Suporta até 10k profissionais
- [ ] Tempo de resposta < 200ms
- [ ] 99.9% uptime

---

## Dependências/Bloqueadores

1. **Fase 5 (Auth)** - Requer decisão sobre RLS policies
2. **Fase 8 (Integração)** - Requer análise de BEQVapp API
3. **Fase 7 (Deploy)** - Requer account em Vercel/provider

---

## Recursos Alocados

- **1 Frontend Developer** - Tempo integral
- **PM** - 4h/semana (revisões)
- **Designer** - Disponível para UI Polish (Fase 3)
- **QA** - Disponível para testes (Fase 6)

---

## Documentação Relacionada

- [FASE2-STATUS.md](FASE2-STATUS.md) - Status atual do Fase 2
- [TESTE-FASE2.md](TESTE-FASE2.md) - Guia de testes
- [seed-profissionais.sql](seed-profissionais.sql) - Dados de teste
- [AREA_CLIENTE_SETUP.md](../AREA_CLIENTE_SETUP.md) - Configuração geral

---

## Notas & Decisões Arquiteturais

### Por que não usar NextAuth.js?

- Supabase Auth é mais simples para esse caso
- Integração nativa com PostgreSQL
- Menor overhead

### Por que useContext em vez de Redux?

- Aplicação pequena (não precisa redux)
- Context suficiente para auth state
- Migrar para Zustand se ficar complexo

### Por que Zod e não ajv?

- Melhor integração com TypeScript
- Runtime + type validation
- Melhor DX

---

**Last Updated:** [Hoje]  
**Next Review:** Após Fase 2 QA  
**Owner:** [Seu nome]  
**Status:** 🟢 ON TRACK
