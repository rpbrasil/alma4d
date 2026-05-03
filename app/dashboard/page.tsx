"use client";

import { useAuth } from "@/context/auth";
import {
  Users,
  UserCheck,
  Briefcase,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";

const iconMap = {
  Users,
  UserCheck,
  Briefcase,
  BarChart3,
  TrendingUp,
};

export default function DashboardPage() {
  const { loading: authLoading } = useAuth();
  const {
    metrics,
    usuariosKpis,
    loading: metricsLoading,
  } = useDashboardMetrics();

  if (authLoading || metricsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-(--brand-secondary) mx-auto mb-4" />
          <div className="text-sm text-slate-500">Carregando painel…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* =========================
          KPIs DE USUÁRIOS
      ========================= */}
      <section>
        <h2 className="text-xs font-semibold tracking-wide text-(--brand) mb-3">
          CONTAGEM DE USUÁRIOS
        </h2>

        <div className="grid sm:grid-cols-4 gap-4">
          {[
            { label: "Total", value: usuariosKpis.total },
            { label: "Ativos", value: usuariosKpis.ativos },
            { label: "Inativos", value: usuariosKpis.inativos },
            { label: "Gestores", value: usuariosKpis.gestores },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {item.label}
              </p>
              <p className="mt-1 text-2xl font-extrabold text-(--brand)">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* =========================
          CARDS PRINCIPAIS
      ========================= */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metrics
          .filter(
            (m) =>
              ![
                "Questionários Aplicados",
                "Questionários Concluídos",
                "Usuários Avaliados",
                "Programações Ativas",
              ].includes(m.label),
          )
          .map((metric) => {
            const Icon = iconMap[metric.icon as keyof typeof iconMap] || Users;

            return (
              <Link key={metric.label} href={metric.href}>
                <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">
                        {metric.label}
                      </p>
                      <p className="text-3xl font-bold text-(--brand) mt-2">
                        {metric.value}
                      </p>
                    </div>
                    <Icon className="h-8 w-8 text-(--brand-highlight)" />
                  </div>
                </div>
              </Link>
            );
          })}
      </section>

      {/* =========================
          COPSOQ
      ========================= */}
      <section>
        <h2 className="text-xs font-semibold tracking-wide text-(--brand) mb-3">
          MAPEAMENTO DE RISCO PSICOSSOCIAL — COPSOQ II
        </h2>

        <div className="grid sm:grid-cols-4 gap-4">
          {metrics
            .filter((m) =>
              [
                "Questionários Aplicados",
                "Questionários Concluídos",
                "Usuários Avaliados",
                "Programações Ativas",
              ].includes(m.label),
            )
            .map((metric) => (
              <Link key={metric.label} href={metric.href}>
                <div className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-sm transition cursor-pointer">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    {metric.label}
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-(--brand-secondary)">
                    {metric.value}
                  </p>
                </div>
              </Link>
            ))}
        </div>
      </section>
    </div>
  );
}
