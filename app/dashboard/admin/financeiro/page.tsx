import { createClient } from "@supabase/supabase-js";
import FinanceiroCharts from "@/components/financeiro/FinanceiroCharts";
import { KpiCard } from "@/components/financeiro/KpiCard";

export default async function FinanceiroPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: financeiro } = await supabase
    .from("v_financeiro_base")
    .select("*");
  
  //calculo das receitas paga, prevista e perdida
  const receitaPaga =
    financeiro
      ?.filter((f) => f.payment_status === "paid")
      .reduce((acc, f) => acc + (f.valor_cents ?? 0), 0) ?? 0;
  
  const receitaPrevista =
    financeiro
      ?.filter((f) => f.payment_status === "pending")
      .reduce((acc, f) => acc + (f.valor_cents ?? 0), 0) ?? 0;

  const receitaPerdida =
    financeiro
      ?.filter((f) => f.payment_status === "failed")
      .reduce((acc, f) => acc + (f.valor_cents ?? 0), 0) ?? 0;

  const baseConversao = receitaPaga + receitaPrevista;
  const taxaConversao =
    baseConversao > 0 ? (receitaPaga / baseConversao) * 100 : 0;
  
  const mrr =
    financeiro
      ?.filter((f) => f.payment_status === "paid")
      .reduce((acc, f) => acc + (f.valor_cents ?? 0), 0) ?? 0;
  
  const pagamentosTotal =
    financeiro?.filter((f) => f.payment_status === "paid") ?? [];

  const ticketMedio =
    pagamentosTotal.length > 0
      ? pagamentosTotal.reduce((acc, f) => acc + (f.valor_cents ?? 0), 0) /
        pagamentosTotal.length
      : 0;
  
  const clientesAtivos = new Set(
    financeiro
      ?.filter((f) => f.payment_status === "paid")
      .map((f) => f.cliente_id),
  ).size;
  
  const { data } = await supabase
    .from("v_kpi_financeiro_diario")
    .select("*")
    .order("dia", { ascending: true });

  const revenueData =
    data?.map((d) => {
      const date = new Date(d.dia);

      const month = date.toLocaleDateString("pt-BR", {
        month: "short",
      });

      const day = date.getDate();

      return {
        month: `${day}${month}`, // ✅ 2 mai
        revenue: (d.receita_paga ?? 0) / 100,
      };
    }) ?? [];


  // ✅ KPIs básicos (provisório)
  const totalReceita =
    data?.reduce((acc, d) => acc + (d.receita_paga ?? 0), 0) ?? 0;

  const { data: funil } = await supabase
    .from("v_funil_pagamento")
    .select("*")
    .single();

  const paymentStatus = funil
    ? [
        { name: "Pago", value: funil.pagos ?? 0 },
        { name: "Pendente", value: funil.aguardando_pagamento ?? 0 },
        { name: "Falho", value: funil.falhos ?? 0 },
      ]
    : [];

  const { data: clientes } = await supabase
    .from("v_kpi_cliente")
    .select("*")
    .order("receita_paga", { ascending: false })
    .limit(5);
  
  const clienteIds = [
    ...new Set(clientes?.map((c) => c.cliente_id).filter(Boolean)),
  ];

  const { data: clientesNome } = await supabase
    .from("clientes")
    .select("id, nome")
    .in("id", clienteIds);

  const clientesMap = Object.fromEntries(
    (clientesNome ?? []).map((c) => [c.id, c.nome]),
  );
  
  const clientesData =
    clientes?.map((c) => ({
      name:
  c.cliente_id && clientesMap[c.cliente_id]
    ? clientesMap[c.cliente_id].split(" ").slice(0, 2).join(" ")
          : "—",
      value: (c.receita_paga ?? 0) / 100,
    })) ?? [];

  const { count: semNfse } = await supabase
    .from("v_alerta_sem_nfse")
    .select("*", { count: "exact", head: true });

  const { count: nfseSemEmail } = await supabase
    .from("v_alerta_nfse_sem_email")
    .select("*", { count: "exact", head: true });

  const { count: divergencias } = await supabase
    .from("v_alerta_divergencia")
    .select("*", { count: "exact", head: true });

  return (
    <div className="p-6 space-y-6 bg-surface-muted min-h-screen">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard
          title="Receita Total"
          value={`R$ ${(totalReceita / 100).toLocaleString("pt-BR")}`}
        />
        <KpiCard
          title="MRR"
          value={`R$ ${(mrr / 100).toLocaleString("pt-BR")}`}
        />
        <KpiCard
          title="Ticket Médio"
          value={`R$ ${(ticketMedio / 100).toLocaleString("pt-BR")}`}
        />
        <KpiCard title="Clientes Ativos" value={clientesAtivos.toString()} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard
          title="Receita Paga"
          value={`R$ ${(receitaPaga / 100).toLocaleString("pt-BR")}`}
          valueClass="text-brand-secondary"
        />

        <KpiCard
          title="Receita Prevista"
          value={`R$ ${(receitaPrevista / 100).toLocaleString("pt-BR")}`}
          valueClass="text-brand-highlight"
        />

        <KpiCard
          title="Receita Perdida"
          value={`R$ ${(receitaPerdida / 100).toLocaleString("pt-BR")}`}
          valueClass="text-brand-accent"
        />
        <KpiCard
          title="Taxa de Conversao"
          value={`${taxaConversao.toFixed(1)}%`}
          valueClass="text-brand"
        />
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {/* 🚨 SEM NFSE */}
        <div className="bg-brand-accent/10 text-brand-accent p-4 rounded-xl shadow-sm">
          <p className="text-xs font-medium">Recebido sem NF</p>
          <p className="text-2xl font-bold">{semNfse ?? 0}</p>
          <p className="text-xs opacity-80">Pagamentos sem emissão fiscal</p>
        </div>

        {/* 📭 SEM EMAIL */}
        <div className="bg-brand-highlight/10 text-brand-highlight p-4 rounded-xl shadow-sm">
          <p className="text-xs font-medium">NF não enviada</p>
          <p className="text-2xl font-bold">{nfseSemEmail ?? 0}</p>
          <p className="text-xs opacity-80">Notas não enviadas ao cliente</p>
        </div>

        {/* 🔴 DIVERGÊNCIA */}
        <div className="bg-brand-secondary/10 text-brand-secondary p-4 rounded-xl shadow-sm">
          <p className="text-xs font-medium">Divergência</p>
          <p className="text-2xl font-bold">{divergencias ?? 0}</p>
          <p className="text-xs opacity-80">
            Diferença entre contrato e pagamento
          </p>
        </div>
      </div>

      {/* ✅ gráfico real */}
      <FinanceiroCharts
        revenueData={revenueData}
        paymentStatus={paymentStatus}
        clientesData={clientesData}
      />
    </div>
  );
}
