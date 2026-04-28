"use client";

import { Plus, Edit2, Trash2, Search, Shield } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

export default function UsuariosPage() {
  const [searchTerm, setSearchTerm] = useState("");

  // Placeholder data
  const usuarios = [
    { id: "1", email: "admin@example.com", role: "admin", status: "ativo" },
    { id: "2", email: "cliente@example.com", role: "cliente", status: "ativo" },
    { id: "3", email: "gestor@example.com", role: "gestor", status: "inativo" },
  ];

  const getRoleBadge = (role: string) => {
    const styles: { [key: string]: string } = {
      admin: "bg-red-100 text-red-800",
      cliente: "bg-blue-100 text-blue-800",
      gestor: "bg-purple-100 text-purple-800",
      usuario: "bg-gray-100 text-gray-800",
    };
    return styles[role] || styles.usuario;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Usuários</h1>
          <p className="text-gray-600 mt-2">
            Gerencie permissões e acessos dos usuários
          </p>
        </div>
        <Link
          href="/dashboard/usuarios/novo"
          className="inline-flex items-center gap-2 bg-[#030870] text-white px-4 py-2 rounded-lg hover:bg-[#020556] transition-colors"
        >
          <Plus size={20} />
          Novo Usuário
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Buscar usuários..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#019499]"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Função
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {usuarios.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {user.email}
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Shield size={16} className="text-gray-400" />
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadge(user.role)}`}
                    >
                      {user.role}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.status === "ativo"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm space-x-2 flex gap-2">
                  <Link
                    href={`/dashboard/usuarios/${user.id}/editar`}
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <Edit2 size={16} />
                  </Link>
                  <button className="text-red-600 hover:text-red-800 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
