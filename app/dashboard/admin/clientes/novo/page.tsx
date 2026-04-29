"use client";

import { criarCliente } from "../actions";
import { useRouter } from "next/navigation";

export default function NovoClientePage() {
  const router = useRouter();

  async function onSubmit(formData: FormData) {
    await criarCliente(formData);
    router.push("/dashboard/admin/clientes");
  }

  return (
    <form action={onSubmit} className="max-w-lg space-y-4">
      <h1 className="text-xl font-semibold">Novo cliente</h1>

      <select name="tipo" required className="w-full border p-2">
        <option value="cnpj">CNPJ</option>
        <option value="cpf">CPF</option>
      </select>

      <input name="nome" placeholder="Nome / Razão social" required />
      <input name="documento" placeholder="CPF ou CNPJ" required />
      <input name="email" placeholder="Email (opcional)" />
      <input name="telefone" placeholder="Telefone (opcional)" />

      <button className="bg-brand text-white px-4 py-2 rounded">
        Criar cliente
      </button>
    </form>
  );
}
