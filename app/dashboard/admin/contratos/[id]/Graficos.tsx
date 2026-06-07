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
  pagarme_payment_status?: string;
};

type Props = {
  contrato: {
    created_at: string;
    limite_usuarios: number;
    valor_total: number;
  };
  upgrades: Upgrade[];
};

type DataPoint = {
  data: string;
  usuarios: number;
  receita: number;
  mrr: number;
  tipo: string;
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: {
    payload: DataPoint;
  }[];
  label?: string;
};

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-white border shadow-lg rounded-lg p-3 text-sm min-w-47.5">
      <p className="text-xs text-gray-400 mb-1">{label}</p>

      <div className="flex justify-between">
        <span className="text-gray-500">Usuários</span>
        <span className="font-semibold text-blue-600">{data.usuarios}</span>
      </div>

      <div className="flex justify-between">
        <span className="text-gray-500">Receita</span>
        <span className="font-semibold text-green-600">
          {data.receita.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        </span>
      </div>

      <div className="flex justify-between">
        <span className="text-gray-500">MRR</span>
        <span className="font-semibold text-purple-600">
          {data.mrr.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        </span>
      </div>

      <div className="mt-2 text-[10px] text-gray-400 uppercase">
        {data.tipo}
      </div>
    </div>
  );
}

export default function Graficos({ contrato, upgrades }: Props) {
  if (!contrato) {
    return <p className="text-sm text-gray-500">Sem dados</p>;
  }

  const upgradesPagos =
    upgrades?.filter((u) => u.pagarme_payment_status === "paid") ?? [];

  const sorted = [...upgradesPagos].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  let receita = contrato.valor_total ?? 0;
  let usuarios = contrato.limite_usuarios ?? 0;

  // ✅ suposição: contrato = plano mensal
  let mrr = receita;

  const data: {
    data: string;
    usuarios: number;
    receita: number;
    mrr: number;
    tipo: string;
  }[] = [];

  // ✅ ponto inicial
  data.push({
    data: new Date(contrato.created_at).toLocaleDateString(),
    usuarios,
    receita,
    mrr,
    tipo: "Contrato",
  });

  // ✅ upgrades
  sorted.forEach((u) => {
    const valor = u.total_cents / 100;

    receita += valor;
    usuarios = u.limite_novo;

    // ✅ MRR cresce com upgrade
    mrr += valor;

    data.push({
      data: new Date(u.created_at).toLocaleDateString(),
      usuarios,
      receita,
      mrr,
      tipo: "Upgrade",
    });
  });

  return (
    <div className="space-y-8">
      {/* Usuários */}
      <div>
        <h3 className="font-semibold mb-2">Crescimento de Usuários</h3>

        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <XAxis dataKey="data" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="usuarios"
              stroke="#2563eb"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Receita */}
      <div>
        <h3 className="font-semibold mb-2">Receita Acumulada</h3>

        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <XAxis dataKey="data" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="receita"
              stroke="#16a34a"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* MRR */}
      <div>
        <h3 className="font-semibold mb-2">MRR (Mensal)</h3>

        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <XAxis dataKey="data" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="mrr"
              stroke="#9333ea"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
