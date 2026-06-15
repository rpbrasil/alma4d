export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { ContratosTable } from "./ContratosTable";
import { ExportToolbar } from "@/components/dashboard/ExportToolbar";

type Contrato = {
  id: string;
  numero_contrato: string;
  versao: number | null;
  status: string;
  tipo_contrato: string;
  data_inicio: string;
  data_fim: string | null;
  cliente_id: string | null;
  criado_em: string;
};

export default async function ContratosPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data } = await supabase
    .from("contratos")
    .select("*")
    .order("criado_em", { ascending: false });

  const contratos = (data ?? []) as Contrato[];

  const clienteIds = [
    ...new Set(contratos.map((c) => c.cliente_id).filter(Boolean)),
  ];

  const { data: clientesData } = await supabase
    .from("clientes")
    .select("id,nome")
    .in("id", clienteIds);

  const clientesMap = Object.fromEntries(
    (clientesData ?? []).map((c) => [c.id, c.nome]),
  );

  // ✅ FORMATAÇÃO
  const contratosFormatados = contratos.map((c) => ({
    ...c,
    cliente_nome:
      c.cliente_id && clientesMap[c.cliente_id]
        ? clientesMap[c.cliente_id].split(" ").slice(0, 2).join(" ")
        : "—",

    data_inicio_fmt: c.data_inicio
      ? new Date(c.data_inicio).toLocaleDateString("pt-BR")
      : "",
  }));

  // ✅ KPIs
  const total = contratos.length;
  const ativos = contratos.filter((c) => c.status === "ativo").length;
  const encerrados = contratos.filter((c) => c.status === "encerrado").length;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid sm:grid-cols-3 gap-4">
        {/* TOTAL */}
        <div className="rounded-xl bg-surface shadow-sm p-4">
          <p className="text-xs text-secondary">Total</p>
          <p className="text-2xl font-bold text-primary">{total}</p>
        </div>

        {/* ATIVOS */}
        <div className="rounded-xl bg-surface shadow-sm p-4">
          <p className="text-xs text-secondary">Ativos</p>
          <p className="text-2xl font-bold text-brand-secondary">{ativos}</p>
        </div>

        {/* ENCERRADOS */}
        <div className="rounded-xl bg-surface shadow-sm p-4">
          <p className="text-xs text-secondary">Encerrados</p>
          <p className="text-2xl font-bold text-brand-accent">{encerrados}</p>
        </div>
      </div>
      {/* Header */}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Contratos</h2>
          <p className="text-sm text-gray-500">
            Gestão de contratos por cliente
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <ExportToolbar
            title="Contratos"
            rows={contratosFormatados}
            columns={[
              { label: "Contrato", key: "numero_contrato" },
              { label: "Cliente", key: "cliente_nome" },
              { label: "Versão", key: "versao" },
              { label: "Status", key: "status" },
              {
                label: "Início",
                key: "data_inicio_fmt",
              },
            ]}
          />

          <Link
            href="/dashboard/admin/contratos/novo"
            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto bg-[#019499] text-white px-4 py-2 rounded-lg hover:opacity-90"
          >
            Novo contrato
          </Link>
        </div>
      </div>
      {/* ✅ TABELA COM FILTROS */}
      <ContratosTable contratos={contratosFormatados} />
    </div>
  );
}
