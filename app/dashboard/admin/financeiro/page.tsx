export const dynamic = "force-dynamic";

import AlertasOperacionais from "@/components/financeiro/AlertasOperacionais";
import { createClient } from "@supabase/supabase-js";
import FinanceiroCharts from "@/components/financeiro/FinanceiroCharts";
import { KpiCard } from "@/components/financeiro/KpiCard";

export default async function FinanceiroPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  type KPIItem = {
    dia: string;
    receita_paga?: number | null;
    receita_prevista?: number | null;
    receita_perdida?: number | null;
    pagamentos_count?: number | null;
  };

  type Cliente = {
    cliente_id?: string | null;
    receita_paga?: number | null;
  };
  type Funil = {
    pagos?: number | null;
    aguardando_pagamento?: number | null;
    falhos?: number | null;
  };

  // Parallel queries: use materialized view for KPIs to avoid loading v_financeiro_base entirely
  const [kpiResp, funilResp, topClientesResp, clientesCountResp] =
    await Promise.all([
      supabase
        .from("v_kpi_financeiro_diario")
        .select("*")
        .order("dia", { ascending: true }),
      supabase.from("v_funil_pagamento").select("*").single(),
      supabase
        .from("v_kpi_cliente")
        .select("*")
        .order("receita_paga", { ascending: false })
        .limit(5),
      // get count of clients with receita_paga > 0
      supabase
        .from("v_kpi_cliente")
        .select("*", { count: "exact", head: true })
        .gt("receita_paga", 0),
    ]);

  const data = kpiResp.data ?? [];
  const { data: funil } = funilResp;
  const clientes = topClientesResp.data ?? [];
  const clientesAtivos = clientesCountResp.count ?? 0;

  //calculo das receitas paga, prevista e perdida
  // derive KPIs from materialized view
  const receitaPaga =
    data?.reduce((acc, d) => acc + (d.receita_paga ?? 0), 0) ?? 0;
  const receitaPrevista =
    data?.reduce((acc, d) => acc + (d.receita_prevista ?? 0), 0) ?? 0;
  const receitaPerdida =
    data?.reduce((acc, d) => acc + (d.receita_perdida ?? 0), 0) ?? 0;

  const baseConversao = receitaPaga + receitaPrevista;
  const taxaConversao =
    baseConversao > 0 ? (receitaPaga / baseConversao) * 100 : 0;

  const mrr = receitaPaga;

  const pagamentosCountTotal =
    data?.reduce((acc, d) => acc + (d.pagamentos_count ?? 0), 0) ?? 0;
  const ticketMedio =
    pagamentosCountTotal > 0 ? receitaPaga / pagamentosCountTotal : 0;

  const revenueData =
    data?.map((d: KPIItem) => {
      const date = new Date(d.dia);

      const month = date.toLocaleDateString("pt-BR", {
        month: "short",
      });

      const day = date.getDate();

      return {
        month: `${day}${month}`,
        revenue: (d.receita_paga ?? 0) / 100,
      };
    }) ?? [];

  // ✅ KPIs básicos (provisório)
  const totalReceita =
    data?.reduce((acc, d) => acc + (d.receita_paga ?? 0), 0) ?? 0;

  const paymentStatus = (funil as Funil)
    ? [
        { name: "Pago", value: (funil as Funil).pagos ?? 0 },
        { name: "Pendente", value: (funil as Funil).aguardando_pagamento ?? 0 },
        { name: "Falho", value: (funil as Funil).falhos ?? 0 },
      ]
    : [];

  // `clientes` already fetched above as topClientesResp
  const clienteIds = [
    ...new Set(clientes?.map((c: Cliente) => c.cliente_id).filter(Boolean)),
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

  const { count: nfseAtrasada } = await supabase
    .from("v_alerta_nfse_atrasada")
    .select("*", { count: "exact", head: true });

  const { count: pagamentoSemEmail } = await supabase
    .from("v_alerta_pagamento_sem_email")
    .select("*", { count: "exact", head: true });

  const { count: boletoNaoEnviado } = await supabase
    .from("v_alerta_boleto_nao_enviado")
    .select("*", { count: "exact", head: true });

  const { count: pixNaoEnviado } = await supabase
    .from("v_alerta_pix_nao_enviado")
    .select("*", { count: "exact", head: true });
  const { data: repasses } = await supabase
    .from("parceiros_repasses")
    .select("valor, status");

  const comissaoPendente =
    repasses
      ?.filter((r) => r.status === "pendente")
      .reduce((acc, r) => acc + (r.valor ?? 0), 0) ?? 0;

  const comissaoPago =
    repasses
      ?.filter((r) => r.status === "pago")
      .reduce((acc, r) => acc + (r.valor ?? 0), 0) ?? 0;

  const comissaoTotal = comissaoPendente + comissaoPago;

  return (
    <div className="p-6 space-y-6 bg-surface-muted min-h-screen">
      {/* ✅ ALERTAS OPERACIONAIS (CLIENT COMPONENT) */}
      <AlertasOperacionais
        nfseAtrasada={nfseAtrasada}
        pagamentoSemEmail={pagamentoSemEmail}
        boletoNaoEnviado={boletoNaoEnviado}
        pixNaoEnviado={pixNaoEnviado}
      />
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
        <KpiCard title="Clientes Ativos" value={String(clientesAtivos)} />

        <KpiCard
          title="Ticket Médio"
          value={(ticketMedio / 100).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        />
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
      {/* //kpis de parceiros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          title="Comissão Parceiros (Pendente)"
          value={comissaoPendente.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
          valueClass="text-yellow-600"
        />

        <KpiCard
          title="Comissão Paga"
          value={comissaoPago.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
          valueClass="text-green-600"
        />
        <KpiCard
          title="Total Comissão"
          value={`R$ ${(comissaoTotal / 100).toLocaleString("pt-BR")}`}
          valueClass="text-slate-800"
        />
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-brand-accent/10 text-brand-accent p-4 rounded-xl shadow-sm">
          <p className="text-xs font-medium">Recebido sem NF</p>
          <p className="text-2xl font-bold">{semNfse ?? 0}</p>
        </div>

        <div className="bg-brand-highlight/10 text-brand-highlight p-4 rounded-xl shadow-sm">
          <p className="text-xs font-medium">NF não enviada</p>
          <p className="text-2xl font-bold">{nfseSemEmail ?? 0}</p>
        </div>

        <div className="bg-brand-secondary/10 text-brand-secondary p-4 rounded-xl shadow-sm">
          <p className="text-xs font-medium">Divergência</p>
          <p className="text-2xl font-bold">{divergencias ?? 0}</p>
        </div>
      </div>
      <FinanceiroCharts
        revenueData={revenueData}
        paymentStatus={paymentStatus}
        clientesData={clientesData}
      />
    </div>
  );
}
