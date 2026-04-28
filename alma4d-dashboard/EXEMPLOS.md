# 📚 Exemplos de Código - Fase 2

Exemplos de como usar a Fase 2 implementada.

---

## 🎯 Exemplo 1: Usar o Hook em um Componente

```typescript
"use client";

import { useProfissionais } from "@/hooks/useProfissionais";
import { useEffect } from "react";

export function MeuComponente() {
  // Carregar todos os profissionais, apenas os ativos
  const { profissionais, loading, error, search, create, remove } =
    useProfissionais({ autoLoad: true, filtroAtivo: true });

  // Buscar por nome
  const handleSearch = async (term: string) => {
    await search(term);
  };

  // Criar novo
  const handleCreate = async () => {
    try {
      const novo = await create({
        nome: "Dr. João",
        especialidade: "Psicologia",
        documento: "12345678909",
        calendly_url: "https://calendly.com/joao",
        bio_resumida: "Especialista em terapia",
        foto_url: "https://example.com/foto.jpg",
        website_url: "https://joao.com",
        linkedin_url: "https://linkedin.com/in/joao",
        instagram_url: "https://instagram.com/joao",
        whatsapp_url: "https://wa.me/5511999999999",
        numero_conselho: "12345/SP",
        ativo: true,
      });
      console.log("Criado:", novo);
    } catch (err) {
      console.error("Erro:", err);
    }
  };

  // Deletar
  const handleDelete = async (id: string) => {
    try {
      await remove(id);
      console.log("Deletado!");
    } catch (err) {
      console.error("Erro:", err);
    }
  };

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error}</div>;

  return (
    <div>
      <h1>Profissionais ({profissionais.length})</h1>

      {/* Busca */}
      <input
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Buscar por nome..."
      />

      {/* Lista */}
      <ul>
        {profissionais.map(prof => (
          <li key={prof.id}>
            {prof.nome} - {prof.especialidade}
            <button onClick={() => handleDelete(prof.id)}>Deletar</button>
          </li>
        ))}
      </ul>

      {/* Criar */}
      <button onClick={handleCreate}>Novo Profissional</button>
    </div>
  );
}
```

---

## 🎯 Exemplo 2: Usar Service Diretamente

```typescript
import {
  getProfissionaisCrud,
  createProfissional,
  updateProfissional,
  deleteProfissional,
  searchProfissionais,
} from "@/services/profissionais";

// Listar todos os profissionais ativos
async function listar() {
  const profissionais = await getProfissionaisCrud(true); // true = ativos
  console.log(profissionais);
}

// Criar
async function criar() {
  const novo = await createProfissional({
    nome: "Dra. Maria",
    especialidade: "Coaching",
    documento: "34028316000152", // CNPJ válido
    calendly_url: "https://calendly.com/maria",
    ativo: true,
  });
  console.log("ID do novo:", novo.id);
}

// Atualizar
async function atualizar(id: string) {
  const atualizado = await updateProfissional(id, {
    especialidade: "Coaching Executivo",
  });
  console.log("Atualizado:", atualizado);
}

// Buscar
async function buscar() {
  const resultados = await searchProfissionais("Maria");
  console.log("Encontrados:", resultados);
}

// Deletar
async function deletar(id: string) {
  await deleteProfissional(id);
  console.log("Deletado!");
}
```

---

## 🎯 Exemplo 3: Validação com Zod

```typescript
import { z } from "zod";
import { isDocumentoValido } from "@/types/profissional";

// Schema básico
const profissionalSchema = z.object({
  nome: z.string().min(3).max(200),
  especialidade: z.string().min(2).max(100),
  documento: z
    .string()
    .refine((doc) => isDocumentoValido(doc), "CPF ou CNPJ inválido"),
  calendly_url: z.string().url("URL inválida"),
  bio_resumida: z.string().max(500).optional(),
  numero_conselho: z.string().optional(),
  ativo: z.boolean().default(true),
});

// Validar dados
try {
  const dados = profissionalSchema.parse({
    nome: "Dr. João",
    especialidade: "Psicologia",
    documento: "12345678909", // CPF
    calendly_url: "https://calendly.com/joao",
  });
  console.log("Válido:", dados);
} catch (err) {
  console.error("Erro de validação:", err.errors);
}
```

---

## 🎯 Exemplo 4: Tratamento de Erros

```typescript
import { createProfissional } from "@/services/profissionais";

async function criar() {
  try {
    const novo = await createProfissional({
      nome: "Dr. João",
      especialidade: "Psicologia",
      documento: "12345678909", // Já existe!
      calendly_url: "https://calendly.com/joao",
      ativo: true,
    });
  } catch (err) {
    if (err instanceof Error) {
      if (
        err.message.includes("Documento") &&
        err.message.includes("já cadastrado")
      ) {
        console.error("Documento duplicado! Tente outro.");
      } else {
        console.error("Erro desconhecido:", err.message);
      }
    }
  }
}
```

---

## 🎯 Exemplo 5: Usar em Página (Page.tsx)

```typescript
"use client";

import { useAuth } from "@/context/auth";
import { useProfissionais } from "@/hooks/useProfissionais";
import Link from "next/link";

export default function ProfissionaisPage() {
  // Contexto
  const { role } = useAuth();

  // Hook customizado
  const { profissionais, loading, error, search, remove } =
    useProfissionais({ autoLoad: true });

  // Handlers
  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza?")) return;
    try {
      await remove(id);
    } catch (err) {
      alert("Erro ao deletar!");
    }
  };

  // Render
  return (
    <div>
      <h1>Profissionais</h1>

      {/* Apenas admin/cliente pode criar */}
      {(role === "admin" || role === "cliente") && (
        <Link href="/dashboard/profissionais/novo">
          + Novo Profissional
        </Link>
      )}

      {/* Loading */}
      {loading && <p>Carregando...</p>}

      {/* Erro */}
      {error && <p style={{ color: "red" }}>Erro: {error}</p>}

      {/* Lista */}
      {!loading && profissionais.length === 0 && (
        <p>Nenhum profissional cadastrado</p>
      )}

      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Especialidade</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {profissionais.map(prof => (
            <tr key={prof.id}>
              <td>{prof.nome}</td>
              <td>{prof.especialidade}</td>
              <td>
                {(role === "admin" || role === "cliente") && (
                  <>
                    <Link href={`/dashboard/profissionais/${prof.id}/editar`}>
                      Editar
                    </Link>
                    <button onClick={() => handleDelete(prof.id)}>
                      Deletar
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 🎯 Exemplo 6: Validadores de Documento

```typescript
import {
  isCPFValido,
  isCNPJValido,
  isDocumentoValido,
} from "@/types/profissional";

// Testar CPF
console.log(isCPFValido("12345678909")); // boolean
console.log(isCPFValido("111.111.111-11")); // boolean

// Testar CNPJ
console.log(isCNPJValido("34028316000152")); // boolean
console.log(isCNPJValido("34.028.316/0001-52")); // boolean

// Testar qualquer um
console.log(isDocumentoValido("12345678909")); // CPF
console.log(isDocumentoValido("34028316000152")); // CNPJ
console.log(isDocumentoValido("PENDENTE")); // Especial
console.log(isDocumentoValido("123456789")); // Inválido

// Uso em validação
if (isDocumentoValido(documento)) {
  // Prosseguir
} else {
  // Mostrar erro
}
```

---

## 🎯 Exemplo 7: Atualizar Profissional

```typescript
"use client";

import { useParams } from "next/navigation";
import { useProfissionais } from "@/hooks/useProfissionais";
import { getProfissionalById } from "@/services/profissionais";
import { useEffect, useState } from "react";
import type { Profissional } from "@/types/profissional";

export default function EditarPage() {
  const params = useParams();
  const id = params?.id as string;

  const { update, loading } = useProfissionais({ autoLoad: false });
  const [profissional, setProfissional] = useState<Profissional | null>(null);

  // Carregar dados
  useEffect(() => {
    async function load() {
      const data = await getProfissionalById(id);
      setProfissional(data);
    }
    load();
  }, [id]);

  // Enviar
  const handleSubmit = async (formData: any) => {
    try {
      const atualizado = await update(id, formData);
      console.log("Atualizado:", atualizado);
      // Redirecionar
    } catch (err) {
      alert("Erro ao atualizar!");
    }
  };

  if (!profissional) return <div>Carregando...</div>;

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      handleSubmit(Object.fromEntries(formData));
    }}>
      <input
        name="nome"
        defaultValue={profissional.nome}
        required
      />
      <input
        name="especialidade"
        defaultValue={profissional.especialidade}
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
```

---

## 🎯 Exemplo 8: Tipos TypeScript

```typescript
import type { Profissional, ProfissionalFormData } from "@/types/profissional";

// Tipo completo
const prof: Profissional = {
  id: "uuid-123",
  nome: "Dr. João",
  especialidade: "Psicologia",
  documento: "12345678909",
  calendly_url: "https://calendly.com/joao",
  bio_resumida: "Especialista em terapia",
  foto_url: "https://example.com/foto.jpg",
  website_url: "https://joao.com",
  linkedin_url: "https://linkedin.com/in/joao",
  instagram_url: "https://instagram.com/joao",
  whatsapp_url: "https://wa.me/5511999999999",
  numero_conselho: "12345/SP",
  ativo: true,
  created_at: new Date().toISOString(),
};

// Tipo para form (sem id nem created_at)
const formData: ProfissionalFormData = {
  nome: "Dra. Maria",
  especialidade: "Coaching",
  documento: "34028316000152",
  calendly_url: "https://calendly.com/maria",
  // Resto é opcional
};
```

---

## 🔗 Referência Rápida

| O que fazer | Onde            | Exemplo                                |
| ----------- | --------------- | -------------------------------------- |
| Listar      | Hook ou Service | `useProfissionais({ autoLoad: true })` |
| Criar       | Hook ou Service | `create(formData)`                     |
| Atualizar   | Hook ou Service | `update(id, dados)`                    |
| Deletar     | Hook ou Service | `remove(id)`                           |
| Buscar      | Hook ou Service | `search("João")`                       |
| Validar     | Types           | `isDocumentoValido(doc)`               |
| Tipificar   | Types           | `type Profissional`                    |

---

## 🚀 Próximos Passos

1. **Copie um exemplo acima**
2. **Cole em seu arquivo**
3. **Adapte para seu caso**
4. **Teste!**

Todos os exemplos são funcionar e prontos para copiar/colar! ✨

---

**Última atualização:** [Hoje]  
**Versão:** Fase 2 - Final  
**Status:** ✅ Pronto para uso
