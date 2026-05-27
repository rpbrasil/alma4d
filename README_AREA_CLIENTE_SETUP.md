# 🔐 Área de Cliente - Guia de Implementação

## ✅ O que foi criado

### 1. **Página de Login** (`/app/cliente/page.tsx`)

- Design limpo e profissional
- Ícone de segurança no topo
- Informações de segurança no rodapé
- Responsivo (mobile, tablet, desktop)
- Dark mode suportado

### 2. **Componente LoginForm** (`/app/components/forms/LoginForm.tsx`)

- Formulário com validação básica
- Campos: Email e Senha
- Toggle para mostrar/ocultar senha
- Loading state durante o login
- Mensagens de erro e sucesso
- Ícones do Lucide React
- Estilização Tailwind com tema alma4D

### 3. **Menu Atualizado** (Header.tsx)

- Link "Área de Cliente" adicionado ao menu desktop
- Link "Área de Cliente" adicionado ao menu mobile
- Estilo com borda subtil (teal/brand-secondary)
- Responsive design

---

## 🎨 Paleta de Cores Utilizada

| Elemento                | Cor               | Código  |
| ----------------------- | ----------------- | ------- |
| Brand Principal         | Azul Escuro       | #030870 |
| Brand Secundário (Teal) | Teal              | #019499 |
| Accent                  | Laranja           | #df633f |
| Highlight               | Roxo              | #6126e2 |
| Background              | Branco            | #ffffff |
| Surface Muted           | Cinza Claro       | #f7f7fb |
| Border                  | Cinza Muito Claro | #e7e7f2 |

---

## 🔌 Integração com Supabase

### Passo 1: Instalar cliente Supabase (já está no package.json)

```bash
npm install @supabase/supabase-js
```

### Passo 2: Configurar variáveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_supabase_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima_aqui
```

### Passo 3: Criar cliente Supabase reutilizável

Atualizar `lib/supabase/clients.ts`:

```typescript
import { createBrowserClient } from "@supabase/ssr";

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
```

### Passo 4: Integrar autenticação no LoginForm

Atualizar `app/components/forms/LoginForm.tsx`:

```typescript
"use client";

import React, { useState } from "react";
import { createClient } from "@/lib/supabase/clients";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();
  const supabase = createClient();//gera multiplas instancias

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const { data, error: supabaseError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (supabaseError) {
        setError(supabaseError.message);
        return;
      }

      setSuccess("Login realizado com sucesso!");
      setEmail("");
      setPassword("");

      // Redirecionar após 1 segundo
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Erro ao fazer login");
    } finally {
      setIsLoading(false);
    }
  };

  // ... resto do código permanece igual
}
```

### Passo 5: Criar página de dashboard (`/app/dashboard/page.tsx`)

```typescript
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/cliente");
  }

  return (
    <main className="min-h-screen bg-surface dark:bg-surface">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold mb-2">Bem-vindo, {user.email}!</h1>
        <p className="text-foreground/60 mb-8">Este é seu dashboard pessoal</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Cards com informações */}
        </div>
      </div>
    </main>
  );
}
```

### Passo 6: Adicionar logout no menu

Adicionar um componente UserMenu no Header:

```typescript
{user && (
  <button onClick={() => handleLogout()} className="...">
    Sair
  </button>
)}
```

---

## 📋 Checklist de Próximos Passos

- [ ] Configurar credenciais Supabase
- [ ] Testar login/logout
- [ ] Criar página de dashboard
- [ ] Implementar "Esqueceu a senha?"
- [ ] Implementar "Criar conta"
- [ ] Adicionar proteção de rotas (middleware)
- [ ] Configurar JWT refresh tokens
- [ ] Adicionar verificação de email
- [ ] Implementar 2FA (autenticação em dois fatores)
- [ ] Adicionar sessão persistente

---

## 🚀 Para testar localmente

```bash
npm run dev
```

Acesse: `http://localhost:3000/cliente`

---

## 📝 Notas

- O formulário é um cliente (`"use client"`) - componente React interativo
- Tailwind CSS está configurado com suporte a dark mode
- Todos os estilos seguem a paleta alma4D
- Lucide React fornece os ícones
- Supabase já está no `package.json`
