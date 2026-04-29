"use client";

import { useAuth } from "@/context/auth";
import { Users, BarChart3, TrendingUp } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-slate-500">Carregando painel…</div>
      </div>
    );
  }

  const kpis = [
    {
      label: "Profissionais ativos",
      value: "12",
      icon: Users,
      href: "/dashboard/profissionais",
    },
    {
      label: "Relatórios gerados",
      value: "4",
      icon: BarChart3,
      href: "/dashboard/relatorios",
    },
    {
      label: "Variação mensal",
      value: "+23%",
      icon: TrendingUp,
      href: "/dashboard/relatorios",
    },
  ];

  return (
    <div className="space-y-10">
      {/* Page title */}
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">Visão geral</h1>
        <p className="text-sm text-slate-500">
          Acompanhe os principais indicadores da sua operação
        </p>
      </header>

      {/* KPI cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {kpis.map((item) => {
          const Icon = item.icon;

          return (
            <Link key={item.label} href={item.href} className="group">
              <div className="bg-white border border-slate-200 rounded-lg p-5 hover:border-[#019499] transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500">{item.label}</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-900">
                      {item.value}
                    </p>
                  </div>

                  <div className="text-slate-400 group-hover:text-[#019499] transition-colors">
                    <Icon size={20} />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </section>

      {/* Contextual info */}
      {role === "cliente" && (
        <section className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="text-sm font-semibold text-slate-900">
            Próximos passos
          </h2>
          <p className="mt-2 text-sm text-slate-600 max-w-2xl">
            Utilize o painel para gerenciar profissionais, acompanhar relatórios
            e garantir a conformidade com os requisitos da NR‑1.
          </p>
        </section>
      )}

      {/* Activity */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <h2 className="text-sm font-semibold text-slate-900">
          Atividade recente
        </h2>

        <div className="mt-4 space-y-3 text-sm text-slate-600">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span>Dashboard inicializado com sucesso</span>
            <span className="text-xs text-slate-400">Agora</span>
          </div>
        </div>
      </section>
    </div>
  );
}