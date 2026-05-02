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
  const { role, loading: authLoading } = useAuth();
  const { metrics, loading: metricsLoading } = useDashboardMetrics();

  if (authLoading || metricsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#019499] mx-auto mb-4" />
          <div className="text-sm text-slate-500">Carregando painel…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Visão Geral</h1>
        <p className="text-gray-600">Bem-vindo ao seu painel de controle</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metrics.map((metric, idx) => {
          const Icon = iconMap[metric.icon as keyof typeof iconMap] || Users;
          return (
            <Link key={idx} href={metric.href}>
              <div
                className={`bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer ${metric.bgColor}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">
                      {metric.label}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {metric.value}
                    </p>
                  </div>
                  <Icon className={`h-8 w-8 ${metric.iconColor}`} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
