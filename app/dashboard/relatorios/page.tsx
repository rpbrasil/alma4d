"use client";

import { useState } from "react";
import RelatoriosDesempenho from "@/components/dashboard/relatorios/RelatoriosDesempenho";
import RelatoriosPsicossocial from "@/components/dashboard/relatorios/RelatoriosPsicossocial";

export default function RelatoriosPage() {
  const [activeTab, setActiveTab] = useState<"desempenho" | "psicossocial">(
    "desempenho",
  );

  const tabs = [
    { id: "desempenho", label: "Desempenho" },
    { id: "psicossocial", label: "Psicossocial" },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as "desempenho" | "psicossocial")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? "border-(--brand) text-(--brand)"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "desempenho" && <RelatoriosDesempenho />}
        {activeTab === "psicossocial" && <RelatoriosPsicossocial />}
      </div>
    </div>
  );
}
