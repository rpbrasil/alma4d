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
  Shield,
  User,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useAuth } from "@/context/auth";
import {
  listarUsuariosAdmin,
  listarClientesParaFiltro,
  setUsuarioAtivo,
  inativarUsuario,
  type UsuarioRow,
  type Role,
} from "./actions";
import { ExportToolbar } from "@/components/dashboard/ExportToolbar";

type ClienteOption = { id: string; nome: string };

type FilterRole = "todos" | Role;
type FilterAtivo = "todos" | "ativos" | "inativos";

function fmtDateBR(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
}

function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

function roleBadge(role: Role) {
  if (role === "admin") return "bg-red-100 text-red-800";
  if (role === "cliente") return "bg-blue-100 text-blue-800";
  if (role === "gestor") return "bg-purple-100 text-purple-800";
  return "bg-gray-100 text-gray-800";
}

export default function UsuariosAdminPage() {
  const { role } = useAuth();
  const isAdmin = role === "admin";

  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([]);
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [loading, setLoading] = useState(isAdmin);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filterCliente, setFilterCliente] = useState<string>("todos");
  const [filterRole, setFilterRole] = useState<FilterRole>("todos");
  const [filterAtivo, setFilterAtivo] = useState<FilterAtivo>("todos");

  // ✅ domínio: por padrão só usuários vinculados a cliente
  const [showSystemAccounts] = useState(false);

  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    id?: string;
    nome?: string;
  }>({ open: false });

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    let mounted = true;
    (async () => {
      setLoading(true);
      setError("");
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
        const msg =
          e instanceof Error ? e.message : "Erro ao carregar usuários.";
        if (mounted) setError(msg);
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

    return usuarios
      .filter((u) => {
        // ✅ esconde “contas do sistema” (sem cliente) por padrão
        if (!showSystemAccounts && !u.cliente_id) return false;

        if (term) {
          const blob = `${u.nome_completo ?? ""} ${u.email ?? ""} ${
            u.telefone ?? ""
          }`.toLowerCase();
          if (!blob.includes(term)) return false;
        }

        if (filterCliente !== "todos" && u.cliente_id !== filterCliente)
          return false;

        if (filterRole !== "todos" && u.role !== filterRole) return false;

        if (filterAtivo !== "todos") {
          const wantsActive = filterAtivo === "ativos";
          if (wantsActive ? !u.ativo : u.ativo) return false;
        }

        return true;
      })
      .sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
  }, [
    usuarios,
    search,
    filterCliente,
    filterRole,
    filterAtivo,
    showSystemAccounts,
  ]);

  function handleToggleAtivo(id: string, next: boolean) {
    startTransition(async () => {
      try {
        await setUsuarioAtivo(id, next);
        setUsuarios((prev) =>
          prev.map((u) => (u.id === id ? { ...u, ativo: false } : u)),
        );
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Erro ao atualizar usuário.");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await inativarUsuario(id);
        setUsuarios((prev) => prev.filter((u) => u.id !== id));
        setConfirmDelete({ open: false });
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Erro ao inativar usuário.");
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
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Título */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Usuários</h2>
          <p className="text-sm text-slate-500">
            Gerencie usuários, funções e vínculos com clientes
          </p>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-3">
          <ExportToolbar
            title="Usuarios"
            rows={filtered}
            columns={[
              { label: "Nome", getValue: (u) => u.nome_completo ?? "" },
              { label: "Email", key: "email" },
              { label: "Telefone", key: "telefone" },
              {
                label: "Cliente",
                getValue: (u) => u.cliente_nome ?? "",
              },
              {
                label: "Função",
                getValue: (u) =>
                  u.role === "admin"
                    ? "Administrador"
                    : u.role === "gestor"
                      ? "Gestor"
                      : u.role === "cliente"
                        ? "Cliente"
                        : "Usuário",
              },
              {
                label: "Status",
                getValue: (u) => (u.ativo ? "Ativo" : "Inativo"),
              },
              {
                label: "Cadastro",
                getValue: (u) => fmtDateBR(u.created_at),
              },
              {
                label: "Último acesso",
                getValue: (u) =>
                  u.ultimo_acesso ? fmtDateBR(u.ultimo_acesso) : "Nunca",
              },
            ]}
          />

          <Link
            href="/dashboard/admin/usuarios/novo"
            className="inline-flex items-center gap-2 bg-[#019499] text-white px-4 py-2 rounded-lg hover:bg-[#017a7d] transition-colors font-medium whitespace-nowrap"
          >
            <Plus size={18} />
            Novo Usuário
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="text-red-600 shrink-0" size={20} />
          <div>
            <p className="font-semibold text-red-900">Erro</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* KPIs */}
      {/* <div className="grid sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Total</p>
          <p className="mt-1 text-2xl font-extrabold">{usuariosKpis.total}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Ativos
          </p>
          <p className="mt-1 text-2xl font-extrabold">{usuariosKpis.ativos}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Inativos
          </p>
          <p className="mt-1 text-2xl font-extrabold">{usuariosKpis.inativos}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Gestores
          </p>
          <p className="mt-1 text-2xl font-extrabold">{usuariosKpis.gestores}</p>
        </div>
      </div> */}

      {/* Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, email ou telefone..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#019499]"
          />
        </div>

        <select
          value={filterCliente}
          onChange={(e) => setFilterCliente(e.target.value)}
          className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#019499]"
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
          className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#019499]"
        >
          <option value="todos">Todas as funções</option>
          <option value="admin">Administrador</option>
          <option value="cliente">Cliente</option>
          <option value="gestor">Gestor</option>
          <option value="usuario">Usuário</option>
        </select>

        <select
          value={filterAtivo}
          onChange={(e) => setFilterAtivo(e.target.value as FilterAtivo)}
          className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#019499]"
        >
          <option value="todos">Todos</option>
          <option value="ativos">Ativos</option>
          <option value="inativos">Inativos</option>
        </select>
      </div>

      {/* Toggle domain */}
      {/* <div className="flex items-center gap-2 text-sm text-gray-700">
        <button
          type="button"
          className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg bg-white hover:bg-gray-50"
          onClick={() => setShowSystemAccounts((v) => !v)}
        >
          {showSystemAccounts ? <EyeOff size={16} /> : <Eye size={16} />}
          {showSystemAccounts
            ? "Ocultar contas do sistema"
            : "Mostrar contas do sistema"}
        </button>
        <span className="text-xs text-gray-500">(Contas sem cliente_id)</span>
      </div> */}

      {/* Table / Empty */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Shield className="mx-auto text-gray-400 mb-3" size={48} />
          <p className="text-gray-500">
            Nenhum usuário encontrado com os filtros atuais
          </p>
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
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Função
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Último acesso
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <User size={16} className="text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {u.nome_completo ?? "—"}
                          </p>
                          <p className="text-sm text-gray-500">
                            {u.telefone ?? u.email ?? "—"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-700">
                      <div className="flex items-center gap-1">
                        <Building2 size={14} />
                        {u.cliente_nome ?? "—"}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <Badge className={roleBadge(u.role)}>
                        {u.role === "admin"
                          ? "Administrador"
                          : u.role === "cliente"
                            ? "Cliente"
                            : u.role === "gestor"
                              ? "Gestor"
                              : "Usuário"}
                      </Badge>
                    </td>

                    <td className="px-6 py-4">
                      <Badge
                        className={
                          u.ativo
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }
                      >
                        {u.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        {u.ultimo_acesso ? fmtDateBR(u.ultimo_acesso) : "Nunca"}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/admin/usuarios/${u.id}/editar`}
                          className="text-blue-600 hover:text-blue-800 p-2 rounded hover:bg-blue-50"
                          title="Editar"
                        >
                          <Edit2 size={18} />
                        </Link>

                        <button
                          onClick={() => handleToggleAtivo(u.id, !u.ativo)}
                          className="p-2 rounded hover:bg-gray-100"
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
                          className="text-red-600 hover:text-red-800 p-2 rounded hover:bg-red-50"
                          disabled={pending}
                          title="Inativar"
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
        Mostrando {filtered.length} de{" "}
        {showSystemAccounts
          ? usuarios.length
          : usuarios.filter((u) => !!u.cliente_id).length}{" "}
        usuários
      </div>

      {/* Confirm delete */}
      {confirmDelete.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-5 w-full max-w-sm">
            <p className="font-bold">Inativar usuário</p>
            <p className="text-sm text-gray-600 mt-1">
              Tem certeza que deseja inativar{" "}
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
                {pending ? "Inativando..." : "Inativar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
