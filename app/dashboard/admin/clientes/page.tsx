"use client";

import {
  Plus,
  Edit2,
  Trash2,
  Search,
  AlertCircle,
  Users as UsersIcon,
  Calendar,
  FileText,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useAuth } from "@/context/auth";
import {
  listarClientesAdmin,
  deletarCliente,
  setClienteAtivo,
} from "./actions";

type ClienteRow = {
  id: string;
  tipo: "pf" | "pj";
  nome: string;
  documento: string | null;
  email: string | null;
  telefone: string | null;
  ativo: boolean;
  created_at: string;
  contratos_count: number;
  ultimo_status_contrato: string | null;
  ultimo_inicio: string | null;
};

type FilterTipo = "todos" | "pf" | "pj";
type FilterAtivo = "todos" | "ativos" | "inativos";
type SortBy = "recentes" | "nome" | "contratos";

function onlyDigits(v: string) {
  return (v || "").replace(/\D+/g, "");
}

function formatCPF(value: string) {
  const v = onlyDigits(value).slice(0, 11);
  const p1 = v.slice(0, 3);
  const p2 = v.slice(3, 6);
  const p3 = v.slice(6, 9);
  const p4 = v.slice(9, 11);
  let out = p1;
  if (p2) out += "." + p2;
  if (p3) out += "." + p3;
  if (p4) out += "-" + p4;
  return out;
}

function formatCNPJ(value: string) {
  const v = onlyDigits(value).slice(0, 14);
  const p1 = v.slice(0, 2);
  const p2 = v.slice(2, 5);
  const p3 = v.slice(5, 8);
  const p4 = v.slice(8, 12);
  const p5 = v.slice(12, 14);
  let out = p1;
  if (p2) out += "." + p2;
  if (p3) out += "." + p3;
  if (p4) out += "/" + p4;
  if (p5) out += "-" + p5;
  return out;
}

function fmtDoc(tipo: "pf" | "pj", doc: string | null) {
  if (!doc) return "—";
  return tipo === "pf" ? formatCPF(doc) : formatCNPJ(doc);
}

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

export default function ClientesPage() {
  const { role } = useAuth();
  const isAdmin = role === "admin";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [clientes, setClientes] = useState<ClienteRow[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipo, setFilterTipo] = useState<FilterTipo>("todos");
  const [filterAtivo, setFilterAtivo] = useState<FilterAtivo>("todos");
  const [sortBy, setSortBy] = useState<SortBy>("recentes");

  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    id?: string;
    nome?: string;
  }>({ open: false });

  // ✅ Hooks NUNCA podem ser condicionais.
  // A lógica condicional fica DENTRO do efeito.
  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!isAdmin) {
        // se não for admin, não busca nada
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const data = await listarClientesAdmin();
        if (mounted) setClientes(data);
      } catch (e: unknown) {
        const msg =
          e instanceof Error ? e.message : "Erro ao carregar clientes.";
        if (mounted) setError(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [isAdmin]);

  const filteredClientes = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let list = [...clientes];

    if (term) {
      list = list.filter((c) => {
        const nome = (c.nome || "").toLowerCase();
        const email = (c.email || "").toLowerCase();
        const telefone = (c.telefone || "").toLowerCase();
        const doc = (c.documento || "").toLowerCase();
        return (
          nome.includes(term) ||
          email.includes(term) ||
          telefone.includes(term) ||
          doc.includes(term)
        );
      });
    }

    if (filterTipo !== "todos") {
      list = list.filter((c) => c.tipo === filterTipo);
    }

    if (filterAtivo !== "todos") {
      list = list.filter((c) =>
        filterAtivo === "ativos" ? c.ativo : !c.ativo,
      );
    }

    if (sortBy === "recentes") {
      list.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    } else if (sortBy === "nome") {
      list.sort((a, b) => a.nome.localeCompare(b.nome));
    } else if (sortBy === "contratos") {
      list.sort((a, b) => (b.contratos_count ?? 0) - (a.contratos_count ?? 0));
    }

    return list;
  }, [clientes, searchTerm, filterTipo, filterAtivo, sortBy]);

  const totais = useMemo(() => {
    const total = clientes.length;
    const ativos = clientes.filter((c) => c.ativo).length;
    const inativos = total - ativos;
    const comContrato = clientes.filter((c) => c.contratos_count > 0).length;
    return { total, ativos, inativos, comContrato };
  }, [clientes]);

  const tipoBadge = (tipo: "pf" | "pj") =>
    tipo === "pf"
      ? "bg-slate-100 text-slate-800"
      : "bg-indigo-100 text-indigo-800";

  const ativoBadge = (ativo: boolean) =>
    ativo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800";

  const contratoBadge = (status: string | null) => {
    const s = (status || "").toLowerCase();
    if (s === "ativo") return "bg-green-100 text-green-800";
    if (s === "suspenso") return "bg-yellow-100 text-yellow-800";
    if (s === "encerrado") return "bg-red-100 text-red-800";
    return "bg-slate-100 text-slate-700"; // rascunho ou n/a
  };

  function handleToggleAtivo(id: string, nextValue: boolean) {
    startTransition(async () => {
      try {
        await setClienteAtivo(id, nextValue);
        setClientes((prev) =>
          prev.map((c) => (c.id === id ? { ...c, ativo: nextValue } : c)),
        );
      } catch (e: unknown) {
        const msg =
          e instanceof Error ? e.message : "Não foi possível atualizar status.";
        setError(msg);
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deletarCliente(id);
        setClientes((prev) => prev.filter((c) => c.id !== id));
        setConfirmDelete({ open: false });
      } catch (e: unknown) {
        const msg =
          e instanceof Error ? e.message : "Não foi possível deletar.";
        setError(msg);
      }
    });
  }

  // ✅ Agora sim pode retornar condicionalmente, porque TODOS os hooks já rodaram.
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Clientes</h1>
          <p className="text-sm text-slate-600">
            Gestão real baseada em <strong>clientes</strong> e{" "}
            <strong>contratos</strong>.
          </p>
        </div>

        <Link
          href="/dashboard/admin/clientes/novo"
          className="inline-flex items-center gap-2 bg-[#019499] text-white px-4 py-2 rounded-lg hover:bg-[#017a7d] transition-colors font-medium whitespace-nowrap"
        >
          <Plus size={18} />
          Novo Cliente + Contrato
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
      <div className="grid sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Total</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">
            {totais.total}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Ativos
          </p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">
            {totais.ativos}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Inativos
          </p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">
            {totais.inativos}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Com contrato
          </p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">
            {totais.comContrato}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome, email, documento ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#019499]"
          />
        </div>

        <select
          value={filterTipo}
          onChange={(e) => setFilterTipo(e.target.value as FilterTipo)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#019499]"
        >
          <option value="todos">Todos os tipos</option>
          <option value="pj">PJ (CNPJ)</option>
          <option value="pf">PF (CPF)</option>
        </select>

        <select
          value={filterAtivo}
          onChange={(e) => setFilterAtivo(e.target.value as FilterAtivo)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#019499]"
        >
          <option value="todos">Todos</option>
          <option value="ativos">Ativos</option>
          <option value="inativos">Inativos</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#019499]"
        >
          <option value="recentes">Mais recentes</option>
          <option value="nome">Nome (A–Z)</option>
          <option value="contratos">Mais contratos</option>
        </select>
      </div>

      {/* Empty */}
      {filteredClientes.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <UsersIcon className="mx-auto text-gray-400 mb-3" size={48} />
          <p className="text-gray-500 mb-4">
            {searchTerm || filterTipo !== "todos" || filterAtivo !== "todos"
              ? "Nenhum cliente encontrado"
              : "Nenhum cliente cadastrado ainda"}
          </p>
          {!searchTerm && filterTipo === "todos" && filterAtivo === "todos" && (
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
                    Tipo / Documento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Contratos
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
                {filteredClientes.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{c.nome}</p>
                        <p className="text-sm text-gray-500">
                          {c.email || "—"}
                          {c.telefone ? ` • ${c.telefone}` : ""}
                        </p>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <Badge className={tipoBadge(c.tipo)}>
                          {c.tipo === "pf" ? "PF (CPF)" : "PJ (CNPJ)"}
                        </Badge>
                        <p className="text-sm text-gray-700">
                          {fmtDoc(c.tipo, c.documento)}
                        </p>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <Badge className={ativoBadge(c.ativo)}>
                        {c.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <FileText size={16} />
                          <span className="font-medium">
                            {c.contratos_count}
                          </span>
                          <span className="text-gray-500">contrato(s)</span>
                        </div>
                        <Badge
                          className={contratoBadge(c.ultimo_status_contrato)}
                        >
                          {c.ultimo_status_contrato
                            ? `Último: ${c.ultimo_status_contrato}`
                            : "Sem contrato"}
                        </Badge>
                        {c.ultimo_inicio ? (
                          <p className="text-xs text-gray-500">
                            Início: {fmtDateBR(c.ultimo_inicio)}
                          </p>
                        ) : null}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        {fmtDateBR(c.created_at)}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/admin/clientes/${c.id}/editar`}
                          className="text-blue-600 hover:text-blue-800 p-2 rounded hover:bg-blue-50 transition-colors"
                          title="Editar cliente"
                        >
                          <Edit2 size={18} />
                        </Link>

                        <Link
                          href={`/dashboard/admin/contratos/novo?cliente_id=${c.id}`}
                          className="text-slate-700 hover:text-slate-900 p-2 rounded hover:bg-slate-100 transition-colors"
                          title="Novo contrato"
                        >
                          <FileText size={18} />
                        </Link>

                        <button
                          className="text-slate-700 hover:text-slate-900 p-2 rounded hover:bg-slate-100 transition-colors"
                          title={c.ativo ? "Desativar" : "Ativar"}
                          disabled={pending}
                          onClick={() => handleToggleAtivo(c.id, !c.ativo)}
                        >
                          {c.ativo ? (
                            <ToggleRight size={18} />
                          ) : (
                            <ToggleLeft size={18} />
                          )}
                        </button>

                        <button
                          className="text-red-600 hover:text-red-800 p-2 rounded hover:bg-red-50 transition-colors"
                          title="Deletar"
                          disabled={pending}
                          onClick={() =>
                            setConfirmDelete({
                              open: true,
                              id: c.id,
                              nome: c.nome,
                            })
                          }
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

      {filteredClientes.length > 0 && (
        <div className="text-sm text-gray-500">
          Mostrando {filteredClientes.length} de {clientes.length} clientes
        </div>
      )}

      {/* Modal delete */}
      {confirmDelete.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-gray-200 p-5 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-red-600">
                <AlertCircle size={22} />
              </div>
              <div>
                <p className="font-extrabold text-slate-900">Deletar cliente</p>
                <p className="mt-1 text-sm text-slate-600">
                  Tem certeza que deseja deletar{" "}
                  <strong>{confirmDelete.nome}</strong>? Isso removerá também
                  contratos vinculados (ON DELETE CASCADE).
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 font-semibold text-slate-800 hover:bg-gray-50"
                onClick={() => setConfirmDelete({ open: false })}
                disabled={pending}
              >
                Cancelar
              </button>

              <button
                className="rounded-xl bg-red-600 px-4 py-2 font-semibold text-white hover:opacity-95"
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
