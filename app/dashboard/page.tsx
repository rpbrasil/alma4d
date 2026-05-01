"use client";

import { useAuth } from "@/context/auth";
import { Users, BarChart3, TrendingUp, ActivitySquare } from "lucide-react";
import Link from "next/link";
import { useProfissionais } from "@/hooks/useProfissionais";
import { useRelatorios } from "@/hooks/useRelatorios";

export default function DashboardPage() {
  const { role, loading: authLoading } = useAuth();
  const { data: profissionais, loading: profLoading } = useProfissionais();
  const { relatorios, loading: relLoading } = useRelatorios();

  if (authLoading || profLoading || relLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#019499] mx-auto mb-4" />
          <div className="text-sm text-slate-500">Carregando painel…</div>
        </div>
      </div>
    );
  }

  const kpis = [
    {
      label: "Profissionais ativos",
      value: profissionais.filter((p) => p.ativo).length.toString(),
      icon: Users,
      href: "/dashboard/profissionais",
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      label: "Relatórios gerados",
      value: relatorios.length.toString(),
      icon: BarChart3,
      href: "/dashboard/relatorios",
      bgColor: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      label: "Total de profissionais",
      value: profissionais.length.toString(),
      icon: TrendingUp,
      href: "/dashboard/profissionais",
      bgColor: "bg-purple-50",
      iconColor: "text-purple-600",
    },
  ];

  return (
    <div className="space-y-10">
      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-3xl font-bold text-slate-900">Visão geral</h1>
        <p className="text-sm text-slate-500">
          Acompanhe os principais indicadores da sua operação
        </p>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {kpis.map((item) => {
          const Icon = item.icon;

          return (
            <Link key={item.label} href={item.href} className="group">
              <div
                className={`${item.bgColor} border border-slate-200 rounded-lg p-6 hover:border-[#019499] transition-all hover:shadow-md`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-600 font-medium">
                      {item.label}
                    </p>
                    <p className="mt-3 text-4xl font-bold text-slate-900">
                      {item.value}
                    </p>
                  </div>

                  <div
                    className={`${item.iconColor} group-hover:scale-110 transition-transform`}
                  >
                    <Icon size={24} />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </section>

      {/* Quick actions */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profissionais */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="text-blue-600" size={20} />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">
              Profissionais
            </h3>
          </div>

          <p className="text-sm text-slate-600 mb-4">
            {profissionais.length} profissional
            {profissionais.length !== 1 ? "s" : ""} cadastrado
            {profissionais.length !== 1 ? "s" : ""}
          </p>

          <Link
            href="/dashboard/profissionais"
            className="inline-flex items-center gap-2 text-[#019499] hover:text-[#017a7d] font-medium text-sm"
          >
            Gerenciar →
          </Link>
        </div>

        {/* Relatórios */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="text-green-600" size={20} />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Relatórios</h3>
          </div>

          <p className="text-sm text-slate-600 mb-4">
            {relatorios.length} relatório
            {relatorios.length !== 1 ? "s" : ""} disponível
            {relatorios.length !== 1 ? "is" : ""}
          </p>

          <Link
            href="/dashboard/relatorios"
            className="inline-flex items-center gap-2 text-[#019499] hover:text-[#017a7d] font-medium text-sm"
          >
            Visualizar →
          </Link>
        </div>
      </section>

      {/* Contextual info */}
      {(role === "cliente" || role === "gestor") && (
        <section className="bg-linear-to-r from-[#019499]/10 to-[#019499]/5 border border-[#019499]/20 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <ActivitySquare
              className="text-[#019499] mt-1 shrink-0"
              size={20}
            />
            <div>
              <h2 className="font-semibold text-slate-900 mb-2">
                Próximos passos
              </h2>
              <p className="text-sm text-slate-600 max-w-2xl">
                Utilize o painel para gerenciar profissionais, acompanhar
                relatórios e explorar todas as funcionalidades do sistema.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Acesso rápido */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">
          Acesso rápido
        </h2>

        <div className="space-y-2">
          <Link
            href="/dashboard/profissionais"
            className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50"
          >
            <span className="text-sm font-medium text-slate-700">
              Gerenciar profissionais
            </span>
            <span>→</span>
          </Link>

          <Link
            href="/dashboard/relatorios"
            className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50"
          >
            <span className="text-sm font-medium text-slate-700">
              Ver relatórios
            </span>
            <span>→</span>
          </Link>

          <Link
            href="/dashboard/configuracoes"
            className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50"
          >
            <span className="text-sm font-medium text-slate-700">
              Configurações
            </span>
            <span>→</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
