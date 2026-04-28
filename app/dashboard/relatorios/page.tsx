"use client";

import { BarChart3, TrendingUp, Download } from "lucide-react";

export default function RelatoriosPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-gray-600 mt-2">
            Visualize análises e métricas de desempenho
          </p>
        </div>
        <button className="inline-flex items-center gap-2 bg-[#019499] text-white px-4 py-2 rounded-lg hover:bg-[#017781] transition-colors">
          <Download size={20} />
          Exportar
        </button>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="text-blue-600" size={24} />
            <h3 className="text-lg font-semibold text-gray-900">
              Atividade Geral
            </h3>
          </div>
          <p className="text-gray-600 text-sm">
            Resumo de atividades dos últimos 30 dias
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="text-green-600" size={24} />
            <h3 className="text-lg font-semibold text-gray-900">Crescimento</h3>
          </div>
          <p className="text-gray-600 text-sm">
            Evolução de métricas ao longo do tempo
          </p>
        </div>
      </div>

      {/* Placeholder Chart Area */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          Métricas Principais
        </h2>
        <div className="h-96 bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
          <div className="text-center">
            <BarChart3 className="mx-auto text-gray-400 mb-3" size={48} />
            <p className="text-gray-500">
              Gráficos serão exibidos aqui em breve
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
