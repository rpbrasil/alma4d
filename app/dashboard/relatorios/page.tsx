"use client";

import {
  BarChart3,
  TrendingUp,
  Download,
  FileText,
  AlertCircle,
  ArrowUp,
} from "lucide-react";
import { useState } from "react";
import { useRelatorios } from "@/hooks/useRelatorios";

export default function RelatoriosPage() {
  const { relatorios, metricas, loading, error } = useRelatorios();
  const [filterType, setFilterType] = useState<"all" | "pdf" | "excel" | "csv">(
    "all",
  );

  const filteredRelatorios = relatorios.filter((r) =>
    filterType === "all" ? true : r.tipo === filterType,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#019499] mx-auto mb-4" />
          <p className="text-gray-600">Carregando relatórios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-end">
        <button className="inline-flex items-center gap-2 bg-[#019499] text-white px-4 py-2 rounded-lg hover:bg-[#017a7d] transition-colors font-medium">
          <Download size={18} />
          Exportar
        </button>
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

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metricas.map((metrica, idx) => (
          <div
            key={idx}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  {metrica.label}
                </p>
                <div className="flex items-end gap-2 mt-2">
                  <p className="text-3xl font-bold text-gray-900">
                    {metrica.valor}
                  </p>
                  {metrica.unidade && (
                    <p className="text-xs text-gray-500 mb-1">
                      {metrica.unidade}
                    </p>
                  )}
                </div>
              </div>
              {metrica.variacao && (
                <div className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded">
                  <ArrowUp size={14} className="text-green-600" />
                  <span className="text-sm font-medium text-green-600">
                    +{metrica.variacao}%
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="text-blue-600" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Atividade Geral
              </h3>
              <p className="text-xs text-gray-500">Últimos 30 dias</p>
            </div>
          </div>
          <p className="text-gray-600 text-sm">
            Resumo de atividades e engajamentos
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-green-600" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Crescimento
              </h3>
              <p className="text-xs text-gray-500">Evolução mensal</p>
            </div>
          </div>
          <p className="text-gray-600 text-sm">
            Evolução de métricas ao longo do tempo
          </p>
        </div>
      </div>

      {/* Recent Reports */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              Relatórios Recentes
            </h2>
            {relatorios.length > 0 && (
              <div className="flex gap-2">
                {(["all", "pdf", "excel", "csv"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      filterType === type
                        ? "bg-[#019499] text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {type === "all" ? "Todos" : type.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {filteredRelatorios.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="mx-auto text-gray-400 mb-3" size={48} />
            <p className="text-gray-500">Nenhum relatório disponível</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Título
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Tamanho
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Ação
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRelatorios.map((relatorio) => (
                  <tr key={relatorio.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {relatorio.titulo}
                      </div>
                      <p className="text-sm text-gray-500">
                        {relatorio.descricao}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          relatorio.tipo === "pdf"
                            ? "bg-red-100 text-red-800"
                            : relatorio.tipo === "excel"
                              ? "bg-green-100 text-green-800"
                              : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {relatorio.tipo.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {(relatorio.tamanho / 1024).toFixed(2)} KB
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(relatorio.criado_em).toLocaleDateString(
                        "pt-BR",
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-[#019499] hover:text-[#017a7d] font-medium text-sm">
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
