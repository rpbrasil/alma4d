"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type ContratoUI = {
  id: string;
  numero_contrato: string;
  versao: number | null;
  status: string;
  data_inicio: string;
  cliente_nome: string;
};

type Props = {
  contratos: ContratoUI[];
};

export function ContratosTable({ contratos }: Props) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("todos");
  const [cliente, setCliente] = useState("todos");
  const filtered = useMemo(() => {
    let list = [...contratos];

    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.numero_contrato.toLowerCase().includes(s) ||
          c.cliente_nome.toLowerCase().includes(s),
      );
    }

    if (status !== "todos") {
      list = list.filter((c) => c.status === status);
    }
    if (cliente !== "todos") {
      list = list.filter((c) => c.cliente_nome === cliente);
    }

    return list;
  }, [contratos, search, status, cliente]);

  const isVencendo = (dataInicio: string) => {
    const hoje = new Date();
    const inicio = new Date(dataInicio);

    const diffDias =
      (inicio.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24);

    return diffDias <= 30;
  };
  const badge = (status: string) => {
    if (status === "ativo") return "bg-green-50 text-green-700";
    if (status === "suspenso") return "bg-yellow-100 text-yellow-800";
    if (status === "encerrado") return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-600";
  };
  const clientes = Array.from(new Set(contratos.map((c) => c.cliente_nome)));

  return (
    <div className="space-y-4">
      {/* filtros */}
      <div className="flex flex-col lg:flex-row gap-3">
        <input
          placeholder="Buscar contrato ou cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-surface-muted focus:ring-2 focus:ring-brand-secondary/30 px-3 py-2 rounded-lg"
        />

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-surface-muted focus:ring-2 focus:ring-brand-secondary/30 px-3 py-2 rounded-lg"
        >
          <option value="todos">Todos</option>
          <option value="ativo">Ativos</option>
          <option value="suspenso">Suspensos</option>
          <option value="encerrado">Encerrados</option>
        </select>
        <select
          value={cliente}
          onChange={(e) => setCliente(e.target.value)}
          className="bg-surface-muted focus:ring-2 focus:ring-brand-secondary/30 px-3 py-2 rounded-lg"
        >
          <option value="todos">Todos os clientes</option>
          {clientes.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* tabela */}
      <div className="bg-surface focus:ring-2 focus:ring-brand-secondary/30 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-surface-muted focus:ring-2 focus:ring-brand-secondary/30-b">
            <tr>
              <th className="p-3 text-left">Contrato</th>
              <th className="p-3 text-left">Cliente</th>
              <th className="p-3 text-center">Versão</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center">Início</th>
              <th className="p-3 text-right"></th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((c) => (
              <tr
                key={c.id}
                className={`bg-surface-muted focus:ring-2 focus:ring-brand-secondary/30-b hover:bg-surface-soft ${
                  isVencendo(c.data_inicio) ? "bg-yellow-50" : ""
                }`}
              >
                <td className="p-3 font-medium">{c.numero_contrato}</td>
                <td className="p-3">{c.cliente_nome}</td>
                <td className="p-3 text-center">{c.versao ?? "-"}</td>
                <td className="p-3 text-center">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${badge(c.status)}`}
                  >
                    {c.status}
                  </span>
                </td>
                <td className="p-3 text-center">
                  {new Date(c.data_inicio).toLocaleDateString()}
                </td>
                <td className="p-3 text-right flex justify-end gap-2">
                  <Link
                    href={`/dashboard/admin/contratos/${c.id}`}
                    className="text-blue-600 hover:bg-blue-50 p-2 rounded"
                  >
                    Detalhes
                  </Link>

                  <Link
                    href={`/dashboard/admin/contratos/novo?cliente_id=${c.id}`}
                    className="text-green-600 hover:bg-green-50 p-2 rounded"
                  >
                    Renovar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-sm text-gray-500 px-2">
          Mostrando {filtered.length} de {contratos.length} contratos
        </p>
        {filtered.length === 0 && (
          <p className="p-4 text-center text-gray-500">
            Nenhum contrato encontrado
          </p>
        )}
      </div>
    </div>
  );
}
