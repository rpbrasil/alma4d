"use client";

import { useState } from "react";
import { useAuth } from "@/context/auth";
import RelatoriosDesempenho from "@/components/dashboard/relatorios/RelatoriosDesempenho";
import RelatoriosPsicossocial from "@/components/dashboard/relatorios/RelatoriosPsicossocial";
import { ExportToolbar } from "@/components/dashboard/ExportToolbar";

const tabs = [
  { id: "desempenho", label: "Desempenho" },
  { id: "psicossocial", label: "Psicossocial" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function RelatoriosPage() {
  const { role, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("desempenho");

  // usuário não acessa dashboard
  if (!loading && role === "usuario") {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        Acesso restrito.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Relatórios</h2>
          <p className="text-sm text-slate-500">
            Visualizações analíticas e indicadores
          </p>
        </div>

        {/* Exportação */}
        <ExportToolbar
          title={
            activeTab === "desempenho"
              ? "Relatorio_Desempenho"
              : "Relatorio_Psicossocial"
          }
          rows={[]}
          columns={[]}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? "border-[--brand] text-[--brand]"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Conteúdo */}
      <div>
        {activeTab === "desempenho" && <RelatoriosDesempenho />}
        {activeTab === "psicossocial" && <RelatoriosPsicossocial />}
      </div>
    </div>
  );
}
