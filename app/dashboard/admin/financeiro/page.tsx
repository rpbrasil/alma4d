"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

import { KpiCard } from "@/components/financeiro/KpiCard";

// ✅ MOCK DATA (depois você substitui por Supabase)
const revenueData = [
  { month: "Jan", revenue: 12000 },
  { month: "Fev", revenue: 18000 },
  { month: "Mar", revenue: 14000 },
  { month: "Abr", revenue: 22000 },
  { month: "Mai", revenue: 28000 },
];

const clientsData = [
  { name: "Empresa A", value: 20000 },
  { name: "Empresa B", value: 15000 },
  { name: "Empresa C", value: 8000 },
];

const paymentStatus = [
  { name: "Pago", value: 85 },
  { name: "Pendente", value: 15 },
];

const COLORS = ["var(--brand-secondary)", "var(--brand-accent)"];


export default function FinanceiroPage() {
  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* HEADER */}
      {/* <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Dashboard Financeiro
        </h1>
        <p className="text-gray-500 text-sm">
          Visão geral da performance financeira
        </p>
      </div> */}

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard title="Receita Total" value="R$ 94.000" change="+12%" />
        <KpiCard title="MRR" value="R$ 28.000" change="+8%" />
        <KpiCard title="Ticket Médio" value="R$ 1.450" />
        <KpiCard title="Clientes Ativos" value="32" />
      </div>

      {/* GRÁFICO PRINCIPAL */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="font-semibold mb-4">Receita ao longo do tempo</h2>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={revenueData}>
            <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
            <XAxis dataKey="month" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
              }}
            />

            <Line
              type="monotone"
              dataKey="revenue"
              stroke="var(--brand)" // ✅ principal
              strokeWidth={3}
              dot={{ fill: "var(--brand-secondary)", r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* GRID SECUNDÁRIO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* BAR */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="font-semibold mb-4">Receita por Cliente</h2>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={clientsData}>
              <CartesianGrid stroke="#f3f4f6" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip />

              <Bar
                dataKey="value"
                fill="var(--brand-highlight)"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* PIE */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="font-semibold mb-4">Status de Pagamento</h2>

          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={paymentStatus}
                dataKey="value"
                outerRadius={100}
                innerRadius={60} // ✅ estilo donut (mais SaaS)
                paddingAngle={4}
                label
              >
                {paymentStatus.map((_, index) => (
                  <Cell key={index} fill={COLORS[index]} />
                ))}
              </Pie>

              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

