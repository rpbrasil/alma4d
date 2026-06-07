"use client";

import { criarContrato } from "../actions";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

type Cliente = {
  id: string;
  nome: string;
};

export default function NovoContratoPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("clientes")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");

      setClientes(data ?? []);
      setLoading(false);
    })();
  }, [supabase]);

  async function onSubmit(formData: FormData) {
    await criarContrato(formData);
    router.push("/dashboard/admin/contratos");
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-semibold">Novo contrato</h1>
        <p className="text-sm text-gray-500">
          Crie um novo contrato vinculando a um cliente.
        </p>
      </div>

      {/* FORM */}
      <form
        action={onSubmit}
        className="bg-white border rounded-lg p-6 space-y-6"
      >
        {/* CLIENTE */}
        <div>
          <label className="text-sm font-medium">Cliente</label>

          <select
            name="cliente_id"
            required
            className="mt-1 w-full h-10 border rounded px-3 text-sm"
          >
            <option value="">
              {loading ? "Carregando..." : "Selecione um cliente"}
            </option>

            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome.split(" ").slice(0, 2).join(" ")}
              </option>
            ))}
          </select>
        </div>

        {/* DADOS */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Número</label>
            <input
              name="numero_contrato"
              required
              className="mt-1 w-full h-10 border rounded px-3 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Tipo</label>
            <select
              name="tipo_contrato"
              required
              className="mt-1 w-full h-10 border rounded px-3 text-sm"
            >
              <option value="">Selecione</option>
              <option value="nr1_psicossocial">NR1 Psicossocial</option>
              <option value="alma4d_premium">Alma4D Premium</option>
              <option value="trial_7d">Trial 7 dias</option>
            </select>
          </div>
        </div>

        {/* DATAS */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Início</label>
            <input
              type="date"
              name="data_inicio"
              required
              className="mt-1 w-full h-10 border rounded px-3 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Fim</label>
            <input
              type="date"
              name="data_fim"
              className="mt-1 w-full h-10 border rounded px-3 text-sm"
            />
          </div>
        </div>

        {/* FINANCEIRO */}
        <div>
          <h2 className="text-sm font-semibold mb-3 text-gray-700">
            Financeiro
          </h2>

          <div className="grid gap-4 sm:grid-cols-3">
            <input
              name="valor_mensal"
              type="number"
              step="0.01"
              placeholder="Valor mensal"
              className="h-10 border rounded px-3 text-sm"
            />

            <input
              name="dia_vencimento"
              type="number"
              placeholder="Dia vencimento"
              className="h-10 border rounded px-3 text-sm"
            />

            <select
              name="forma_pagamento"
              className="h-10 border rounded px-3 text-sm"
            >
              <option value="">Forma de pagamento</option>
              <option value="pix">Pix</option>
              <option value="cartao">Cartão</option>
              <option value="boleto">Boleto</option>
            </select>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <input type="checkbox" name="renovacao_automatica" />
            <label className="text-sm">Renovação automática</label>
          </div>
        </div>

        {/* LIMITES */}
        <div>
          <h2 className="text-sm font-semibold mb-3 text-gray-700">Limites</h2>

          <div className="grid gap-4 sm:grid-cols-3">
            <input
              name="limite_usuarios"
              type="number"
              placeholder="Usuários"
              className="h-10 border rounded px-3 text-sm"
            />

            <input
              name="limite_gestores"
              type="number"
              placeholder="Gestores"
              className="h-10 border rounded px-3 text-sm"
            />

            <input
              name="limite_departamentos"
              type="number"
              placeholder="Departamentos"
              className="h-10 border rounded px-3 text-sm"
            />
          </div>
        </div>

        {/* AÇÕES */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/dashboard/admin/contratos")}
            className="px-4 py-2 border rounded text-sm"
          >
            Cancelar
          </button>

          <button className="bg-brand-primary text-white px-4 py-2 rounded text-sm hover:opacity-90">
            Criar contrato
          </button>
        </div>
      </form>
    </div>
  );
}
