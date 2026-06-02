"use client";

import { useState } from "react";

const STATUS_LABELS = {
  recebida: "Recebida",
  em_analise: "Em análise",
  em_tratamento: "Em tratamento",
  resolvida: "Resolvida",
  encerrada: "Encerrada",
  descartada: "Descartada",
} as const;

type StatusDenuncia = keyof typeof STATUS_LABELS;

const STATUS_STYLES: Record<StatusDenuncia, string> = {
  recebida: "bg-slate-100 text-slate-700",
  em_analise: "bg-blue-100 text-blue-700",
  em_tratamento: "bg-yellow-100 text-yellow-700",
  resolvida: "bg-green-100 text-green-700",
  encerrada: "bg-slate-200 text-slate-700",
  descartada: "bg-gray-200 text-gray-600",
};

export default function AcompanhamentoPage() {
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    protocolo: string;
    status: StatusDenuncia;
    updated_at: string;
  } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const steps: StatusDenuncia[] = [
    "recebida",
    "em_analise",
    "em_tratamento",
    "resolvida",
    "encerrada",
  ];

  async function buscar() {
    if (!codigo.trim()) return;

    setLoading(true);
    setErro(null);
    setData(null);

    try {
      const res = await fetch(`/api/protocolo/${codigo}`);

      if (!res.ok) {
        alert("Erro ao atualizar status");
        return;
      }

      const json = await res.json();

      setData(json);
    } catch {
      setErro("Erro ao consultar");
    } finally {
      setLoading(false);
    }
  }

  const currentIndex = data ? steps.indexOf(data.status as StatusDenuncia) : -1;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow border space-y-5">
        {/* HEADER */}
        <h1 className="text-xl font-semibold text-brand text-center">
          Acompanhamento de Protocolo
        </h1>

        <p className="text-sm text-slate-500 text-center">
          Consulte o status da sua ocorrência de forma segura e anônima.
        </p>

        {/* INPUT */}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            placeholder="Digite o protocolo"
            className="flex-1 border rounded-lg px-3 py-2 text-sm"
          />

          <button
            onClick={buscar}
            disabled={loading}
            className="w-full sm:w-auto h-12 px-4 bg-brand text-white rounded-lg"
          >
            {loading ? "..." : "Buscar"}
          </button>
        </div>

        {/* ERRO */}
        {erro && <div className="text-red-600 text-sm text-center">{erro}</div>}

        {/* RESULTADO */}
        {data && (
          <>
            {/* PROTOCOLO */}
            <div className="text-center">
              <p className="text-xs text-slate-500">Protocolo</p>
              <p className="font-semibold text-slate-900">{data.protocolo}</p>
            </div>

            {/* STATUS */}
            <div className="flex justify-center">
              <span
                className={`px-4 py-2 rounded-full text-sm font-medium ${
                  STATUS_STYLES[data.status]
                }`}
              >
                {STATUS_LABELS[data.status]}
              </span>
            </div>

            {/* DATA */}
            <p className="text-xs text-slate-500 text-center">
              Atualizado em {new Date(data.updated_at).toLocaleString("pt-BR")}
            </p>

            {/* TIMELINE */}
            <div className="space-y-2 pt-2">
              {steps.map((step, i) => (
                <div key={step} className="flex items-center gap-2 text-sm">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      i < currentIndex
                        ? "bg-green-500"
                        : i === currentIndex
                          ? "bg-blue-500"
                          : "bg-gray-300"
                    }`}
                  />
                  <span className="capitalize text-slate-700">
                    {STATUS_LABELS[step]}
                  </span>
                </div>
              ))}
            </div>

            {/* PRIVACIDADE */}
            <p className="text-xs text-slate-400 text-center pt-3">
              Este acompanhamento preserva totalmente o anonimato do registro.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
