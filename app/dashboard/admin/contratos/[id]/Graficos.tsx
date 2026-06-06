"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Upgrade = {
  total_cents: number;
  limite_novo: number;
  created_at: string;
};

type Props = {
  upgrades: Upgrade[];
};

export default function Graficos({ upgrades }: Props) {
  if (!upgrades || upgrades.length === 0) {
    return <p className="text-sm text-muted">Sem dados para gráfico</p>;
  }

  // ✅ ordena crescente
  const sorted = [...upgrades].reverse();

  const data = sorted.map((u, index) => {
    const receita = sorted
      .slice(0, index + 1)
      .reduce((acc, cur) => acc + cur.total_cents, 0);

    return {
      data: new Date(u.created_at).toLocaleDateString(),
      usuarios: u.limite_novo,
      receita: receita / 100,
    };
  });

  return (
    <div className="space-y-8">
      {/* 👥 crescimento usuários */}
      <div>
        <h3 className="font-semibold mb-2">Crescimento de Usuários</h3>

        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <XAxis dataKey="data" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="usuarios" stroke="#2563eb" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 💰 receita */}
      <div>
        <h3 className="font-semibold mb-2">Receita Acumulada (R$)</h3>

        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <XAxis dataKey="data" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="receita" stroke="#16a34a" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
