//import { cookies } from "next/headers";
//import { createServerSupabase } from "@/lib/supabase/server";
import Link from "next/link";
import Graficos from "./Graficos";

import { createClient } from "@supabase/supabase-js";


export default async function ContratoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: contratoId } = await params;

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
      clientes ( nome )
    `,
    )
    .eq("id", contratoId)
    .maybeSingle();

  const { data: upgrades } = await supabase
    .from("contratos_upgrades")
    .select("*")
    .eq("contrato_id", contratoId)
    .order("created_at", { ascending: false });

  const { data: eventos } = await supabase
    .from("contrato_eventos")
    .select("*")
    .eq("contrato_id", contratoId)
    .order("created_at", { ascending: false });

  if (!contrato) return <div>Contrato não encontrado</div>;

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
                <b>Cliente:</b> {contrato.clientes?.[0]?.nome ?? "-"}
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

        {/* LADO DIREITO */}
        <div className="space-y-6">
          {/* FINANCEIRO */}
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

          {/* TIMELINE */}
          <div className="bg-white border rounded-lg p-4 sm:p-6">
            <h2 className="font-semibold mb-3">Histórico</h2>

            <div className="max-h-100 overflow-y-auto space-y-3">
              {eventos?.map((e) => (
                <div key={e.id} className="border rounded p-3 text-sm">
                  <p className="font-medium">{e.tipo}</p>
                  <p className="text-gray-500">{e.descricao}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(e.created_at).toLocaleString()}
                  </p>
                </div>
              )) ?? <p className="text-sm">Sem eventos</p>}
            </div>
          </div>
        </div>
      </div>

      {/* GRÁFICOS FULL */}
      <div className="bg-white border rounded-lg p-4 sm:p-6">
        <h2 className="font-semibold mb-4">Gráficos</h2>
        <Graficos upgrades={upgrades ?? []} />
      </div>
    </div>
  );
}
