"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Plus, AlertCircle } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";

type ProfissionalClienteRow = {
  id: string;
  nome: string;
  especialidade: string;
  documento: string;
  ativo_no_cliente: boolean;
  destaque: boolean;
  ordem: number | null;
};
type ProfissionaisClientesSelectRow = {
  ativo: boolean;
  destaque: boolean;
  ordem: number | null;
  profissionais:
    | {
        id: string;
        nome: string;
        especialidade: string;
        documento: string;
      }
    | Array<{
        id: string;
        nome: string;
        especialidade: string;
        documento: string;
      }>
    | null;
};

export default function ProfissionaisDoClientePage() {
  const params = useParams();
  const clienteId = Array.isArray(params.id)
    ? params.id[0]
    : (params.id ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ProfissionalClienteRow[]>([]);
  const supabase = useMemo(() => getSupabaseClient(), []);
  
  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!clienteId) {
        setLoading(false);
        setRows([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from("profissionais_clientes")
          .select(
            `
          ativo,
          destaque,
          ordem,
          profissionais:profissionais (
            id,
            nome,
            especialidade,
            documento
          )
        `,
          )
          .eq("cliente_id", clienteId)
          .order("ordem", { ascending: true });

        if (error) throw error;
        if (!mounted) return;

        const typed = (data ?? []) as ProfissionaisClientesSelectRow[];

        const normalized = typed
          .map((r) => {
            const prof = Array.isArray(r.profissionais)
              ? (r.profissionais[0] ?? null)
              : (r.profissionais ?? null);

            if (!prof) return null;

            return {
              id: prof.id,
              nome: prof.nome,
              especialidade: prof.especialidade,
              documento: prof.documento,
              ativo_no_cliente: r.ativo,
              destaque: r.destaque,
              ordem: r.ordem,
            } as ProfissionalClienteRow;
          })
          .filter((x): x is ProfissionalClienteRow => x !== null);

        setRows(normalized);
      } catch (e) {
        if (!mounted) return;
        console.error("Erro ao carregar profissionais:", e);
        setError("Erro ao carregar profissionais.");
        setRows([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [clienteId, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Carregando profissionais…
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex gap-3">
        <AlertCircle className="text-red-600" />
        <p className="text-red-700 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Profissionais do Cliente
          </h2>
          <p className="text-sm text-slate-500">
            Gerencie vínculo, status e destaque
          </p>
        </div>

        <Link
          href={`/dashboard/admin/clientes/${clienteId}/profissionais/novo`}
          className="inline-flex items-center gap-2 bg-[#019499] text-white px-4 py-2 rounded-lg hover:bg-[#017a7d]"
        >
          <Plus size={18} />
          Vincular profissional
        </Link>
      </div>

      {/* Tabela */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                Profissional
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                Especialidade
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                Status no cliente
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                Destaque
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {rows.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{p.nome}</td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {p.especialidade}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={
                      p.ativo_no_cliente
                        ? "px-2 py-1 rounded-full text-xs bg-green-100 text-green-800"
                        : "px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600"
                    }
                  >
                    {p.ativo_no_cliente ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-6 py-4">{p.destaque ? "⭐" : "—"}</td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-10 text-center text-sm text-gray-500"
                >
                  Nenhum profissional vinculado a este cliente
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
