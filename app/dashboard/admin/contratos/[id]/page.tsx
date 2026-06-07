export const dynamic = "force-dynamic";

import Link from "next/link";
import Graficos from "./Graficos";
import { createClient } from "@supabase/supabase-js";

export default async function ContratoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: contratoId } = await params;

  if (!contratoId) {
    console.error("ID não recebido na rota");
    return <div>ID inválido</div>;
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: contrato } = await supabase
    .from("contratos")
    .select(
      `
      id,
      numero_contrato,
      status,
      tipo_contrato,
      limite_usuarios,
      valor_total,
      pagarme_payment_status,
      forma_pagamento,
      cliente_id,
      criado_em
    `,
    )
    .eq("id", contratoId)
    .maybeSingle();
  
  if (!contrato) return <div>Contrato não encontrado</div>;

  let clienteNome = "-";

  if (contrato.cliente_id) {
    const { data: cliente } = await supabase
      .from("clientes")
      .select("nome")
      .eq("id", contrato.cliente_id)
      .maybeSingle();

    clienteNome = cliente?.nome ?? "-";
  }

  const { data: upgrades } = await supabase
    .from("contratos_upgrades")
    .select("*")
    .eq("contrato_id", contratoId)
    .order("created_at", { ascending: true });

  const { data: eventos } = await supabase
    .from("contrato_eventos")
    .select("*")
    .eq("contrato_id", contratoId)
    .order("created_at", { ascending: false });

  // ✅ TIMELINE
  const timeline: {
    date: Date;
    usuarios: number;
    receita: number;
  }[] = [];

  let usuarios = contrato.limite_usuarios || 0;
  let receita = Number(contrato.valor_total ?? 0);

  // ponto inicial
  timeline.push({
    date: new Date(contrato.criado_em),
    usuarios,
    receita,
  });

  // ✅ aplica upgrades UMA vez e na ordem correta
  upgrades?.forEach((u) => {
    if (u.pagarme_payment_status === "paid") {
      usuarios += u.quantidade_adicional;
      receita += u.total_cents / 100;

      timeline.push({
        date: new Date(u.created_at),
        usuarios,
        receita,
      });
    }
  });

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Link href="/dashboard/admin/contratos" className="text-sm text-brand">
          ← Voltar
        </Link>

        <h1 className="text-lg sm:text-xl font-semibold">
          {contrato.numero_contrato}
        </h1>
      </div>

      {/* GRID PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ESQUERDA */}
        <div className="lg:col-span-2 space-y-6">
          {/* RESUMO */}
          <div className="bg-white border rounded-lg p-4 sm:p-6 space-y-2">
            <h2 className="font-semibold text-base">Resumo</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <p>
                <b>Cliente:</b>{" "}
                {clienteNome
                  ? clienteNome.split(" ").slice(0, 2).join(" ")
                  : "-"}
              </p>
              <p>
                <b>Status:</b> {contrato.status}
              </p>
              <p>
                <b>Tipo:</b> {contrato.tipo_contrato}
              </p>
              <p>
                <b>Usuários:</b> {contrato.limite_usuarios}
              </p>
            </div>
          </div>

          {/* UPGRADES */}
          <div className="bg-white border rounded-lg p-4 sm:p-6">
            <h2 className="font-semibold mb-4">Upgrades</h2>

            {upgrades?.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-150 w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="p-2 text-left">Data</th>
                      <th className="p-2">Qtd</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Total</th>
                      <th className="p-2">Limite</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upgrades.map((u) => (
                      <tr key={u.id} className="border-b">
                        <td className="p-2">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="text-center">
                          +{u.quantidade_adicional}
                        </td>
                        <td className="text-center">
                          {u.pagarme_payment_status}
                        </td>
                        <td className="text-center">
                          {(u.total_cents / 100).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </td>
                        <td className="text-center">{u.limite_novo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Sem upgrades</p>
            )}
          </div>
        </div>

        {/* DIREITA */}
        <div className="space-y-6">
          <div className="bg-white border rounded-lg p-4 sm:p-6 space-y-2">
            <h2 className="font-semibold">Financeiro</h2>

            <p className="text-sm">
              <b>Status:</b> {contrato.pagarme_payment_status}
            </p>

            <p className="text-sm">
              <b>Forma:</b> {contrato.forma_pagamento}
            </p>

            <p className="text-sm">
              <b>Total:</b>{" "}
              {(contrato.valor_total ?? 0).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </p>
          </div>

          <div className="bg-white border rounded-lg p-4 sm:p-6">
            <h2 className="font-semibold mb-4">Histórico</h2>

            {eventos?.length ? (
              <div className="overflow-x-auto">
                <div className="flex gap-4 min-w-max">
                  {eventos.map((e, index) => (
                    <div
                      key={e.id}
                      className="relative min-w-55 max-w-55 bg-gray-50 border rounded-lg p-3 text-sm"
                    >
                      {/* linha conectando */}
                      {index !== 0 && (
                        <div className="absolute -left-2 top-6 w-4 h-0.5 bg-gray-300" />
                      )}

                      {/* tipo */}
                      <p className="font-medium text-gray-800">{e.tipo}</p>

                      {/* descrição */}
                      <p className="text-gray-500 text-xs mt-1 line-clamp-3">
                        {e.descricao}
                      </p>

                      {/* data */}
                      <p className="text-[11px] text-gray-400 mt-2">
                        {new Date(e.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Sem eventos</p>
            )}
          </div>
        </div>
      </div>

      {/* GRÁFICOS */}
      <div className="bg-white border rounded-lg p-4 sm:p-6">
        <h2 className="font-semibold mb-4">Gráficos</h2>
        <Graficos
          contrato={{
            created_at: contrato.criado_em,
            limite_usuarios: contrato.limite_usuarios ?? 0,
            valor_total: Number(contrato.valor_total ?? 0),
          }}
          upgrades={upgrades ?? []}
        />
      </div>
    </div>
  );
}
