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
  clientes: {
    nome: string;
  }[];
};

export default async function ContratosPage() {
  // ✅ Service Role (admin SSR)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

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
      clientes ( nome )
    `,
    )
    .order("criado_em", { ascending: false });

  if (error) {
    console.error("Erro ao buscar contratos:", error);
  }

  const contratos = (data ?? []) as Contrato[];

  return (
    <div className="space-y-6">
      {/* ✅ ação topo */}
      <div className="flex justify-end">
        <Link
          href="/dashboard/admin/contratos/novo"
          className="bg-brand text-white px-4 py-2 rounded"
        >
          Novo contrato
        </Link>
      </div>

      {/* ✅ tabela */}
      <div className="bg-white border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
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
                <tr key={c.id} className="border-b last:border-0">
                  <td className="p-3">{c.numero_contrato}</td>

                  <td className="p-3">{c.clientes?.[0]?.nome ?? "-"}</td>

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
                      className="text-brand-secondary hover:underline"
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
  );
}
