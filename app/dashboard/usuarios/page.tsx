"use client";

import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Shield,
  AlertCircle,
  Mail,
} from "lucide-react";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useUsuarios } from "@/hooks/useUsuarios";
import type { Usuario } from "@/hooks/useUsuarios";

export default function UsuariosPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<
    "todos" | "admin" | "cliente" | "gestor" | "usuario"
  >("todos");

  const { usuarios, loading, error } = useUsuarios();

  // ✅ filtros
  const filteredUsuarios = useMemo(() => {
    return usuarios.filter((u: Usuario) => {
      const matchSearch =
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.nome.toLowerCase().includes(searchTerm.toLowerCase());

      const matchRole = filterRole === "todos" || u.role === filterRole;

      return matchSearch && matchRole;
    });
  }, [usuarios, searchTerm, filterRole]);

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "Administrador",
      cliente: "Cliente",
      gestor: "Gestor",
      usuario: "Usuário",
    };
    return labels[role] || role;
  };

  const getRoleBadgeStyle = (role: string) => {
    const styles: Record<string, string> = {
      admin: "bg-red-100 text-red-800",
      cliente: "bg-blue-100 text-blue-800",
      gestor: "bg-purple-100 text-purple-800",
      usuario: "bg-gray-100 text-gray-800",
    };
    return styles[role] || styles.usuario;
  };

  const getStatusBadgeStyle = (status: string) => {
    return status === "ativo"
      ? "bg-green-100 text-green-800"
      : "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#019499] mx-auto mb-4" />
          <p className="text-gray-600">Carregando usuários...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Usuários</h1>
          <p className="text-gray-600 mt-1 text-sm">
            Gerencie permissões e acessos dos usuários
          </p>
        </div>

        <Link
          href="/dashboard/usuarios/novo"
          className="inline-flex items-center gap-2 bg-[#019499] text-white px-4 py-2 rounded-lg hover:bg-[#017a7d] transition-colors font-medium"
        >
          <Plus size={18} />
          Novo Usuário
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
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-[#019499]"
          />
        </div>

        {/* Role Filter */}
        <select
          value={filterRole}
          onChange={(e) =>
            setFilterRole(
              e.target.value as
                | "todos"
                | "admin"
                | "cliente"
                | "gestor"
                | "usuario",
            )
          }
          className="px-4 py-2 border border-gray-300 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-[#019499]"
        >
          <option value="todos">Todas as funções</option>
          <option value="admin">Administrador</option>
          <option value="cliente">Cliente</option>
          <option value="gestor">Gestor</option>
          <option value="usuario">Usuário</option>
        </select>
      </div>

      {/* Table / Empty */}
      {filteredUsuarios.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Shield className="mx-auto text-gray-400 mb-3" size={48} />
          <p className="text-gray-500">Nenhum usuário encontrado</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Usuário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Função
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Acesso
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filteredUsuarios.map((usuario: Usuario) => (
                  <tr
                    key={usuario.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold">
                          {usuario.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {usuario.nome}
                          </p>
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Mail size={14} />
                            {usuario.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeStyle(
                          usuario.role,
                        )}`}
                      >
                        {getRoleLabel(usuario.role)}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeStyle(
                          usuario.status,
                        )}`}
                      >
                        {usuario.status === "ativo" ? "Ativo" : "Inativo"}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-500">
                      {usuario.ultimo_acesso
                        ? new Date(usuario.ultimo_acesso).toLocaleDateString(
                            "pt-BR",
                          )
                        : "Nunca"}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/usuarios/${usuario.id}/editar`}
                          className="text-blue-600 hover:text-blue-800 p-2 rounded hover:bg-blue-50"
                        >
                          <Edit2 size={18} />
                        </Link>
                        <button
                          className="text-red-600 hover:text-red-800 p-2 rounded hover:bg-red-50"
                          onClick={() => {
                            if (
                              confirm(
                                "Tem certeza que deseja deletar este usuário?",
                              )
                            ) {
                              console.log("Delete:", usuario.id);
                            }
                          }}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer info */}
      <div className="text-sm text-gray-500">
        Mostrando {filteredUsuarios.length} de {usuarios.length} usuários
      </div>
    </div>
  );
}
