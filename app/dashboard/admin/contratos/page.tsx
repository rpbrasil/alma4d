import { createServerSupabase } from "@/app/lib/supabase/server";
import Link from "next/link";

type Contrato = {
  id: string;
  numero_contrato: string;
  versao: number;
  status: string;
  tipo_contrato: string;
  data_inicio: string;
  data_fim: string | null;
  cliente: {
    nome: string;
  };
};

export default async function ContratosPage() {
  const supabase = await createServerSupabase();

  const { data } = await supabase
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

  const contratos = (data ?? []) as Contrato[];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Contratos</h1>
        <Link
          href="/dashboard/admin/contratos/novo"
          className="bg-brand text-white px-4 py-2 rounded"
        >
          Novo contrato
        </Link>
      </header>

      <div className="bg-white border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-surface-muted">
            <tr>
              <th className="p-3 text-left">Contrato</th>
              <th className="p-3 text-left">Cliente</th>
              <th className="p-3">Versão</th>
              <th className="p-3">Status</th>
              <th className="p-3">Início</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {contratos.map((c) => (
              <tr key={c.id} className="border-b last:border-0">
                <td className="p-3">{c.numero_contrato}</td>
                <td className="p-3">{c.cliente?.nome}</td>
                <td className="p-3 text-center">{c.versao}</td>
                <td className="p-3 capitalize">{c.status}</td>
                <td className="p-3">
                  {new Date(c.data_inicio).toLocaleDateString()}
                </td>
                <td className="p-3 text-right">
                  <Link
                    href={`/dashboard/admin/contratos/${c.id}/editar`}
                    className="text-brand-secondary hover:underline"
                  >
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}