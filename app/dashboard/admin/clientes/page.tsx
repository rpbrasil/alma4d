import { createServerSupabase } from "@/app/lib/supabase/server";
import Link from "next/link";

type Cliente = {
  id: string;
  nome: string;
  tipo: string;
  documento: string;
  ativo: boolean;
  created_at: string;
};

export default async function ClientesPage() {
  const supabase = await createServerSupabase();

  const { data: clientes } = await supabase
    .from("clientes")
    .select("id, nome, tipo, documento, ativo, created_at")
    .order("created_at", { ascending: false });

  const lista = (clientes ?? []) as Cliente[];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Clientes</h1>
        <Link
          href="/dashboard/admin/clientes/novo"
          className="bg-brand text-white px-4 py-2 rounded-md text-sm"
        >
          Novo cliente
        </Link>
      </header>

      <div className="bg-white border border-border rounded-lg">
        <table className="w-full text-sm">
          <thead className="border-b">
            <tr className="text-left text-slate-500">
              <th className="p-3">Nome</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Documento</th>
              <th className="p-3">Status</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {lista.map((c) => (
              <tr key={c.id} className="border-b last:border-0">
                <td className="p-3">{c.nome}</td>
                <td className="p-3 uppercase">{c.tipo}</td>
                <td className="p-3">{c.documento}</td>
                <td className="p-3">{c.ativo ? "Ativo" : "Inativo"}</td>
                <td className="p-3 text-right">
                  <Link
                    href={`/dashboard/admin/clientes/${c.id}/editar`}
                    className="text-brand-secondary text-sm"
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
