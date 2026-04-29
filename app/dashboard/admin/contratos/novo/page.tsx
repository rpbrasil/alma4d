"use client";

import { criarContrato } from "../actions";
import { useRouter } from "next/navigation";

export default function NovoContratoPage() {
  const router = useRouter();

  async function onSubmit(formData: FormData) {
    await criarContrato(formData);
    router.push("/dashboard/admin/contratos");
  }

  return (
    <form action={onSubmit} className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-semibold">Novo contrato</h1>

      {/* Cliente (select) */}
      <select name="cliente_id" required className="w-full border p-2">
        {/* carregar clientes */}
      </select>

      <input name="numero_contrato" placeholder="Número do contrato" required />

      <input name="tipo_contrato" placeholder="Tipo de contrato" required />

      <input type="date" name="data_inicio" required />
      <input type="date" name="data_fim" />

      <input
        name="limite_usuarios"
        type="number"
        placeholder="Limite usuários"
      />
      <input
        name="limite_gestores"
        type="number"
        placeholder="Limite gestores"
      />
      <input
        name="limite_departamentos"
        type="number"
        placeholder="Limite departamentos"
      />

      <button className="bg-brand text-white px-4 py-2 rounded">
        Criar contrato
      </button>
    </form>
  );
}
