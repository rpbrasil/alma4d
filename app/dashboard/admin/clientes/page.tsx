"use client";

import {
  Plus,
  Edit2,
  Trash2,
  Search,
  AlertCircle,
  Users as UsersIcon,
  Calendar,
} from "lucide-react";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth";
import { useClientes } from "@/hooks/useClientes";

export default function ClientesPage() {
  const { role } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPlano, setFilterPlano] = useState<
    "todos" | "trial" | "basic" | "premium"
  >("todos");

  const { clientes, loading, error } = useClientes();

  // Filtros
  const filteredClientes = useMemo(() => {
    return clientes.filter((c) => {
      const matchSearch =
        c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchPlano = filterPlano === "todos" || c.plano === filterPlano;

      return matchSearch && matchPlano;
    });
  }, [clientes, searchTerm, filterPlano]);

  // Verificar se é admin
  if (role !== "admin") {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <AlertCircle className="mx-auto text-yellow-600 mb-2" size={24} />
        <p className="text-yellow-800 font-semibold">
          Acesso restrito a administradores
        </p>
      </div>
    );
  }

  const getPlanoLabel = (plano: string) => {
    const labels: { [key: string]: string } = {
      trial: "Trial",
      basic: "Basic",
      premium: "Premium",
    };
    return labels[plano] || plano;
  };

  const getPlanoBadgeStyle = (plano: string) => {
    const styles: { [key: string]: string } = {
      trial: "bg-gray-100 text-gray-800",
      basic: "bg-blue-100 text-blue-800",
      premium: "bg-purple-100 text-purple-800",
    };
    return styles[plano] || styles.trial;
  };

  const getStatusBadgeStyle = (status: string) => {
    if (status === "ativo") return "bg-green-100 text-green-800";
    if (status === "inativo") return "bg-gray-100 text-gray-800";
    return "bg-red-100 text-red-800";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#019499] mx-auto mb-4" />
          <p className="text-gray-600">Carregando clientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-end">
        <Link
          href="/dashboard/admin/clientes/novo"
          className="inline-flex items-center gap-2 bg-[#019499] text-white px-4 py-2 rounded-lg hover:bg-[#017a7d] transition-colors font-medium whitespace-nowrap"
        >
          <Plus size={18} />
          Novo Cliente
        </Link>
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#019499]"
          />
        </div>

        {/* Plan Filter */}
        <select
          value={filterPlano}
          onChange={(e) =>
            setFilterPlano(
              e.target.value as "todos" | "trial" | "basic" | "premium",
            )
          }
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#019499]"
        >
          <option value="todos">Todos os planos</option>
          <option value="trial">Trial</option>
          <option value="basic">Basic</option>
          <option value="premium">Premium</option>
        </select>
      </div>

      {/* Empty State */}
      {filteredClientes.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <UsersIcon className="mx-auto text-gray-400 mb-3" size={48} />
          <p className="text-gray-500 mb-4">
            {searchTerm || filterPlano !== "todos"
              ? "Nenhum cliente encontrado"
              : "Nenhum cliente cadastrado ainda"}
          </p>
          {!searchTerm && filterPlano === "todos" && (
            <Link
              href="/dashboard/admin/clientes/novo"
              className="inline-flex items-center gap-2 bg-[#019499] text-white px-4 py-2 rounded-lg hover:bg-[#017a7d] transition-colors"
            >
              <Plus size={18} />
              Adicionar Cliente
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Plano
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Profissionais
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Cadastro
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredClientes.map((cliente) => {
                  const isPlanoExpired =
                    cliente.data_expiracao_plano &&
                    new Date(cliente.data_expiracao_plano) < new Date() &&
                    cliente.plano === "trial";

                  return (
                    <tr
                      key={cliente.id}
                      className={`hover:bg-gray-50 transition-colors ${
                        isPlanoExpired ? "bg-yellow-50" : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            {cliente.nome}
                          </p>
                          <p className="text-sm text-gray-500">
                            {cliente.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getPlanoBadgeStyle(cliente.plano)}`}
                        >
                          {getPlanoLabel(cliente.plano)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeStyle(cliente.status)}`}
                        >
                          {cliente.status === "ativo"
                            ? "Ativo"
                            : cliente.status === "inativo"
                              ? "Inativo"
                              : "Bloqueado"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-sm text-gray-700">
                          <UsersIcon size={16} />
                          {cliente.profissionais_count}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar size={14} />
                          {new Date(cliente.criado_em).toLocaleDateString(
                            "pt-BR",
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/dashboard/admin/clientes/${cliente.id}/editar`}
                            className="text-blue-600 hover:text-blue-800 p-2 rounded hover:bg-blue-50 transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={18} />
                          </Link>
                          <button
                            className="text-red-600 hover:text-red-800 p-2 rounded hover:bg-red-50 transition-colors"
                            title="Deletar"
                            onClick={() => {
                              if (
                                confirm(
                                  "Tem certeza que deseja deletar este cliente?",
                                )
                              ) {
                                // TODO: Implementar delete
                                console.log("Delete:", cliente.id);
                              }
                            }}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer Info */}
      {filteredClientes.length > 0 && (
        <div className="text-sm text-gray-500">
          Mostrando {filteredClientes.length} de {clientes.length} clientes
        </div>
      )}
    </div>
  );
}
