export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

type Contrato = {
  id: string;
  numero_contrato: string;
  versao: number | null;
  status: string;
  tipo_contrato: string;
  data_inicio: string;
  data_fim: string | null;
  cliente_id: string | null;
  criado_em: string;
};

type Cliente = {
  id: string;
  nome: string;
};

export default async function ContratosPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // ✅ 1. buscar contratos
  const { data, error } = await supabase
    .from("contratos")
    .select(
      `
      id,
      numero_contrato,
      versao,
      status,
      tipo_contrato,
      data_inicio,
      data_fim,
      cliente_id,
      criado_em
    `,
    )
    .order("criado_em", { ascending: false });

  if (error) {
    console.error("Erro ao buscar contratos:", error);
  }

  const contratos = (data ?? []) as Contrato[];

  // ✅ 2. pegar ids únicos
  const clienteIds = [
    ...new Set(
      contratos.map((c) => c.cliente_id).filter((id): id is string => !!id),
    ),
  ];

  // ✅ 3. buscar clientes
  const { data: clientesData } = await supabase
    .from("clientes")
    .select("id, nome")
    .in("id", clienteIds);

  const clientes = (clientesData ?? []) as Cliente[];

  // ✅ 4. mapear para lookup rápido
  const clientesMap = Object.fromEntries(clientes.map((c) => [c.id, c.nome]));

  return (
    <div className="space-y-6">
      {/* topo */}
      <div className="flex justify-end">
        <Link
          href="/dashboard/admin/contratos/novo"
          className="bg-brand text-white px-4 py-2 rounded hover:opacity-90"
        >
          Novo contrato
        </Link>
      </div>

      {/* tabela */}
      <div className="bg-white border border-border rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-175 w-full text-sm">
            <thead className="border-b bg-surface-muted">
              <tr>
                <th className="p-3 text-left">Contrato</th>
                <th className="p-3 text-left">Cliente</th>
                <th className="p-3 text-center">Versão</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Início</th>
                <th className="p-3 text-right"></th>
              </tr>
            </thead>

            <tbody>
              {contratos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-gray-500">
                    Nenhum contrato encontrado
                  </td>
                </tr>
              ) : (
                contratos.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b last:border-0 odd:bg-gray-50"
                  >
                    <td className="p-3">{c.numero_contrato}</td>

                    <td className="p-3">
                      {c.cliente_id && clientesMap[c.cliente_id]
                        ? clientesMap[c.cliente_id]
                            .split(" ")
                            .slice(0, 2)
                            .join(" ")
                        : "-"}
                    </td>

                    <td className="p-3 text-center">{c.versao ?? "-"}</td>

                    <td className="p-3 text-center capitalize">{c.status}</td>

                    <td className="p-3 text-center">
                      {c.data_inicio
                        ? new Date(c.data_inicio).toLocaleDateString()
                        : "-"}
                    </td>

                    <td className="p-3 text-right">
                      <Link
                        href={`/dashboard/admin/contratos/${c.id}`}
                        className="text-brand-secondary hover:opacity-80"
                      >
                        Detalhes
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
