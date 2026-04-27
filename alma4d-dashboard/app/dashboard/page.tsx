"use client";

import { useAuth } from "@/context/auth";
import { BarChart3, Users, TrendingUp, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { user, role, clienteId, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#030870] mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  const cards = [
    {
      title: "Profissionais Ativos",
      value: "12",
      icon: Users,
      color: "bg-blue-100 text-blue-600",
      href: "/dashboard/profissionais",
    },
    {
      title: "Relatórios",
      value: "4",
      icon: BarChart3,
      color: "bg-green-100 text-green-600",
      href: "/dashboard/relatorios",
    },
    {
      title: "Crescimento",
      value: "+23%",
      icon: TrendingUp,
      color: "bg-purple-100 text-purple-600",
      href: "/dashboard/relatorios",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Bem-vindo, {user?.email?.split("@")[0]}! 👋
        </h1>
        <p className="text-gray-600 mt-2">
          Aqui está um resumo do seu dashboard
        </p>
      </div>

      {/* Info Banner */}
      {role === "cliente" && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="text-blue-600 flex-shrink-0" size={20} />
          <div>
            <p className="text-sm font-semibold text-blue-900">
              Bem-vindo ao Alma4D Dashboard
            </p>
            <p className="text-sm text-blue-700 mt-1">
              Gerencie seus profissionais, visualize relatórios e acesse
              configurações da sua conta.
            </p>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.title} href={card.href} className="group">
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">
                      {card.title}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {card.value}
                    </p>
                  </div>
                  <div className={`${card.color} p-3 rounded-lg`}>
                    <Icon size={24} />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Atividade Recente
        </h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <p className="text-sm text-gray-600">
              Dashboard inicializado com sucesso
            </p>
            <span className="ml-auto text-xs text-gray-400">Agora</span>
          </div>
        </div>
      </div>
    </div>
  );
}
