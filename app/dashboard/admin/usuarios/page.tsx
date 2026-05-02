"use client";

import {
  Plus,
  Edit2,
  Trash2,
  Search,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Building2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useAuth } from "@/context/auth";
import {
  listarUsuariosAdmin,
  setUsuarioAtivo,
  deletarUsuario,
  listarClientesParaFiltro,
  type UsuarioRow,
  type Role,
} from "./actions";

type ClienteOption = {
  id: string;
  nome: string;
};

type FilterRole = "todos" | Role;
type FilterAtivo = "todos" | "ativos" | "inativos";

export default function UsuariosAdminPage() {
  const { role } = useAuth();
  const isAdmin = role === "admin";

  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([]);
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filterCliente, setFilterCliente] = useState<string>("todos");
  const [filterRole, setFilterRole] = useState<FilterRole>("todos");
  const [filterAtivo, setFilterAtivo] = useState<FilterAtivo>("todos");

  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    id?: string;
    nome?: string;
  }>({ open: false });

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    let mounted = true;

    (async () => {
      try {
        const [u, c] = await Promise.all([
          listarUsuariosAdmin(),
          listarClientesParaFiltro(),
        ]);
        if (mounted) {
          setUsuarios(u);
          setClientes(c);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Erro ao carregar usuários.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isAdmin]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return usuarios.filter((u) => {
      if (term) {
        const blob = `${u.nome_completo ?? ""} ${u.email ?? ""} ${
          u.telefone ?? ""
        }`.toLowerCase();
        if (!blob.includes(term)) return false;
      }

      if (filterCliente !== "todos" && u.cliente_id !== filterCliente)
        return false;

      if (filterRole !== "todos" && u.role !== filterRole) return false;

      if (
        filterAtivo !== "todos" &&
        (filterAtivo === "ativos" ? !u.ativo : u.ativo)
      )
        return false;

      return true;
    });
  }, [usuarios, search, filterCliente, filterRole, filterAtivo]);

  function handleToggleAtivo(id: string, next: boolean) {
    startTransition(async () => {
      try {
        await setUsuarioAtivo(id, next);
        setUsuarios((prev) =>
          prev.map((u) => (u.id === id ? { ...u, ativo: next } : u)),
        );
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Erro ao atualizar usuário.");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deletarUsuario(id);
        setUsuarios((prev) => prev.filter((u) => u.id !== id));
        setConfirmDelete({ open: false });
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Erro ao deletar usuário.");
      }
    });
  }

  if (!isAdmin) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <AlertCircle className="mx-auto text-yellow-600 mb-2" size={24} />
        <p className="text-yellow-800 font-semibold">
          Acesso restrito a administradores
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-b-2 border-[#019499]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-extrabold">Usuários</h1>

        <Link
          href="/dashboard/admin/usuarios/novo"
          className="inline-flex items-center gap-2 bg-[#019499] text-white px-4 py-2 rounded-lg hover:bg-[#017a7d] transition-colors font-medium whitespace-nowrap"
        >
          <Plus size={18} />
          Novo Usuário
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-3 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, email ou telefone"
            className="w-full pl-10 py-2 border rounded-lg"
          />
        </div>

        <select
          value={filterCliente}
          onChange={(e) => setFilterCliente(e.target.value)}
          className="border rounded-lg px-3 py-2"
        >
          <option value="todos">Todos os clientes</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>

        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value as FilterRole)}
          className="border rounded-lg px-3 py-2"
        >
          <option value="todos">Todos os papéis</option>
          <option value="admin">Admin</option>
          <option value="cliente">Cliente</option>
          <option value="gestor">Gestor</option>
          <option value="usuario">Usuário</option>
        </select>

        <select
          value={filterAtivo}
          onChange={(e) => setFilterAtivo(e.target.value as FilterAtivo)}
          className="border rounded-lg px-3 py-2"
        >
          <option value="todos">Todos</option>
          <option value="ativos">Ativos</option>
          <option value="inativos">Inativos</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-lg overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold">
                Usuário
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold">
                Cliente
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold">
                Papel
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold">
                Ações
              </th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium">{u.nome_completo ?? "—"}</p>
                  <p className="text-sm text-gray-500">
                    {u.email ?? u.telefone ?? "—"}
                  </p>
                </td>

                <td className="px-4 py-3 text-sm">
                  <div className="flex items-center gap-1">
                    <Building2 size={14} />
                    {u.cliente_nome ?? "—"}
                  </div>
                </td>

                <td className="px-4 py-3 text-sm capitalize">{u.role}</td>

                <td className="px-4 py-3">
                  <span
                    className={`px-3 py-1 text-xs rounded-full ${
                      u.ativo
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {u.ativo ? "Ativo" : "Inativo"}
                  </span>
                </td>

                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/dashboard/admin/usuarios/${u.id}/editar`}
                      className="p-2 hover:bg-gray-100 rounded"
                      title="Editar"
                    >
                      <Edit2 size={18} />
                    </Link>

                    <button
                      onClick={() => handleToggleAtivo(u.id, !u.ativo)}
                      className="p-2 hover:bg-gray-100 rounded"
                      disabled={pending}
                      title={u.ativo ? "Desativar" : "Ativar"}
                    >
                      {u.ativo ? (
                        <ToggleRight size={18} />
                      ) : (
                        <ToggleLeft size={18} />
                      )}
                    </button>

                    <button
                      onClick={() =>
                        setConfirmDelete({
                          open: true,
                          id: u.id,
                          nome: u.nome_completo ?? undefined,
                        })
                      }
                      className="p-2 hover:bg-red-50 rounded text-red-600"
                      disabled={pending}
                      title="Deletar"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  className="px-4 py-10 text-center text-sm text-gray-500"
                  colSpan={5}
                >
                  Nenhum usuário encontrado com os filtros atuais.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Confirm delete */}
      {confirmDelete.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-5 w-full max-w-sm">
            <p className="font-bold">Deletar usuário</p>
            <p className="text-sm text-gray-600 mt-1">
              Tem certeza que deseja deletar{" "}
              <strong>{confirmDelete.nome ?? "este usuário"}</strong>?
            </p>

            <div className="mt-4 flex justify-end gap-2">
              <button
                className="px-4 py-2 border rounded-lg"
                onClick={() => setConfirmDelete({ open: false })}
                disabled={pending}
              >
                Cancelar
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded-lg"
                onClick={() => handleDelete(confirmDelete.id!)}
                disabled={pending}
              >
                {pending ? "Deletando..." : "Deletar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
