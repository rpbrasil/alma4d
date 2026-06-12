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
    BarChart, Bar, Cell
} from "recharts";

/* ✅ TIPOS */
type RevenuePoint = {
  month: string;
  revenue: number;
};

type PaymentStatus = {
  name: string;
  value: number;
};

type ClienteBar = {
  name: string;
  value: number;
};

type Props = {
  revenueData: RevenuePoint[];
  paymentStatus: PaymentStatus[];
  clientesData: ClienteBar[];
};

export default function FinanceiroCharts({ revenueData, paymentStatus, clientesData}: Props) {
  return (
    <div className="space-y-6">
      {/* 🔹 GRÁFICO PRINCIPAL */}
      <div className="bg-surface p-6 rounded-xl shadow-sm">
        <h2 className="font-semibold mb-4 text-primary">
          Receita ao longo do tempo
        </h2>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={revenueData}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />

            <XAxis dataKey="month" />
            <YAxis />

            <Tooltip
              formatter={(value) => {
                if (typeof value === "number") {
                  return [`R$ ${value.toLocaleString("pt-BR")}`, "Receita"];
                }
                return [value ?? "-", "Receita"];
              }}
            />

            <Line
              type="monotone"
              dataKey="revenue"
              stroke="var(--color-brand)"
              strokeWidth={3}
              dot={{
                fill: "var(--color-brand-secondary)",
                r: 4,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 🔹 GRID SECUNDÁRIO */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* ✅ BAR CHART */}
        <div className="bg-surface p-6 rounded-xl shadow-sm">
          <h2 className="font-semibold mb-4 text-primary">
            Receita por Cliente
          </h2>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={clientesData}>
              <CartesianGrid stroke="var(--color-border)" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />

              <Bar
                dataKey="value"
                fill="var(--color-brand-highlight)"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ✅ PIE CHART */}
        <div className="bg-surface p-6 rounded-xl shadow-sm">
          <h2 className="font-semibold mb-4 text-primary">
            Status de Pagamento
          </h2>

          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={paymentStatus}
                dataKey="value"
                outerRadius={100}
                innerRadius={60}
                paddingAngle={4}
              >
                {paymentStatus.map((_, index) => (
                  <Cell
                    key={index}
                    fill={
                      index === 0
                        ? "var(--color-brand-secondary)" // pago
                        : index === 1
                          ? "var(--color-brand-highlight)" // pendente
                          : "var(--color-brand-accent)" // falho
                    }
                  />
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
