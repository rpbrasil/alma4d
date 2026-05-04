"use client";

import { Plus, Search, AlertCircle, Users as UsersIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useAuth } from "@/context/auth";
import { useProfissionais } from "@/hooks/useProfissionais";
import type { Profissional } from "@/types/profissional";

type FilterAtivo = "todos" | "ativos" | "inativos";
type SortBy = "nome";

export default function ProfissionaisPage() {
  const { role, loading: authLoading } = useAuth();
  const { data: profissionais, loading, error } = useProfissionais();

  const canManage = role === "admin" || role === "gestor";

  const [searchTerm, setSearchTerm] = useState("");
  const [filterAtivo, setFilterAtivo] = useState<FilterAtivo>("todos");
  const [sortBy] = useState<SortBy>("nome");

  /* ✅ TODOS OS HOOKS FICAM AQUI EM CIMA */

  const filtered = useMemo(() => {
    let list = [...profissionais];

    const term = searchTerm.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (p) =>
          p.nome.toLowerCase().includes(term) ||
          (p.email || "").toLowerCase().includes(term),
      );
    }

    if (filterAtivo !== "todos") {
      list = list.filter((p) =>
        filterAtivo === "ativos" ? p.ativo : !p.ativo,
      );
    }

    if (sortBy === "nome") {
      list.sort((a, b) => a.nome.localeCompare(b.nome));
    }

    return list;
  }, [profissionais, searchTerm, filterAtivo, sortBy]);

  const totais = useMemo(() => {
    const total = profissionais.length;
    const ativos = profissionais.filter((p) => p.ativo).length;
    const inativos = total - ativos;
    return { total, ativos, inativos };
  }, [profissionais]);

  /* ✅ AGORA PODE FAZER RETURNS CONDICIONAIS */

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#019499] mx-auto mb-4" />
          <p className="text-gray-600">Carregando profissionais...</p>
        </div>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <AlertCircle className="mx-auto text-yellow-600 mb-2" size={24} />
        <p className="text-yellow-800 font-semibold">
          Acesso restrito a administradores e gestores
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Profissionais
          </h2>
          <p className="text-sm text-slate-500">
            Gerencie os profissionais cadastrados
          </p>
        </div>

        <Link
          href="/dashboard/profissionais/novo"
          className="inline-flex items-center gap-2 bg-[#019499] text-white
                     px-4 py-2 rounded-lg hover:bg-[#017a7d]
                     transition-colors font-medium"
        >
          <Plus size={18} />
          Novo profissional
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="text-red-600 shrink-0" size={20} />
          <div>
            <p className="font-semibold text-red-900">Atenção</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Kpi label="Total" value={totais.total} />
        <Kpi label="Ativos" value={totais.ativos} />
        <Kpi label="Inativos" value={totais.inativos} />
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-[#019499]"
          />
        </div>

        <select
          value={filterAtivo}
          onChange={(e) => setFilterAtivo(e.target.value as FilterAtivo)}
          className="px-4 py-2 border border-gray-300 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-[#019499]"
        >
          <option value="todos">Todos</option>
          <option value="ativos">Ativos</option>
          <option value="inativos">Inativos</option>
        </select>
      </div>

      {/* Empty / Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <UsersIcon className="mx-auto text-gray-400 mb-3" size={48} />
          <p className="text-gray-500 mb-4">
            {searchTerm || filterAtivo !== "todos"
              ? "Nenhum profissional encontrado"
              : "Nenhum profissional cadastrado ainda"}
          </p>

          <Link
            href="/dashboard/profissionais/novo"
            className="inline-flex items-center gap-2 bg-[#019499]
                       text-white px-4 py-2 rounded-lg hover:bg-[#017a7d]"
          >
            <Plus size={18} />
            Adicionar profissional
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Profissional
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Especialidade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Documento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    {/* Nome */}
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{p.nome}</p>
                    </td>

                    {/* Especialidade */}
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {p.especialidade}
                    </td>

                    {/* Documento */}
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {p.documento}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span
                        className={
                          p.ativo
                            ? "inline-flex px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                            : "inline-flex px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600"
                        }
                      >
                        {p.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/dashboard/profissionais/${p.id}`}
                        className="text-[#019499] hover:underline font-medium"
                      >
                        Editar
                      </Link>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-10 text-center text-sm text-gray-500"
                    >
                      Nenhum profissional encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="text-sm text-gray-500">
          Mostrando {filtered.length} de {profissionais.length} profissionais
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-slate-900">{value}</p>
    </div>
  );
}
