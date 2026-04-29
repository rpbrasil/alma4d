"use client";

import { useAuth } from "@/context/auth";
import { Plus, Edit2, Trash2, Search, AlertCircle, Loader } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useProfissionais } from "@/hooks/useProfissionais";
import type { Profissional } from "@/types/profissional";

export default function ProfissionaisPage() {
  const { role, loading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: rawProfissionais, loading, error } = useProfissionais();

  // 🔍 Busca local (UI only)
  const profissionais = rawProfissionais.filter((p) =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const canManage = role === "admin" || role === "cliente";

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#030870] mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Profissionais</h1>
          <p className="text-gray-600 mt-2">
            Gerencie todos os profissionais da sua organização
          </p>
        </div>

        {canManage && (
          <Link
            href="/dashboard/profissionais/novo"
            className="inline-flex items-center gap-2 bg-[#030870] text-white px-4 py-2 rounded-lg hover:bg-[#020556] transition-colors"
          >
            <Plus size={20} />
            Novo Profissional
          </Link>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="text-red-600 shrink-0" size={20} />
          <div>
            <p className="font-semibold text-red-900">Erro ao carregar</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Buscar profissionais..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={loading}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#019499] disabled:bg-gray-50"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-center">
              <Loader
                className="animate-spin mx-auto mb-2 text-[#030870]"
                size={24}
              />
              <p className="text-gray-600">Carregando profissionais...</p>
            </div>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Especialidade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                {canManage && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Ações
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {profissionais.length === 0 ? (
                <tr>
                  <td
                    colSpan={canManage ? 4 : 3}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    Nenhum profissional cadastrado
                  </td>
                </tr>
              ) : (
                profissionais.map((prof) => (
                  <tr
                    key={prof.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {prof.nome}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {prof.especialidade || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          prof.ativo
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {prof.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>

                    {canManage && (
                      <td className="px-6 py-4 text-sm flex gap-2">
                        <Link
                          href={`/dashboard/profissionais/${prof.id}/editar`}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <Edit2 size={16} />
                        </Link>
                        <button
                          disabled
                          className="text-gray-400 cursor-not-allowed"
                          title="Remoção será habilitada posteriormente"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}