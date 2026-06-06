"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  Calendar,
  Download,
  Eye,
  FileText,
  RefreshCw,
} from "lucide-react";

type ContratoRow = {
  id: string;
  numero_contrato: string;
  versao: number;
  status: "rascunho" | "ativo" | "suspenso" | "encerrado";
  criado_em: string;
  atualizado_em: string;
  pdf_url: string | null;
  pdf_assinado_url: string | null;
  tipo_contrato: string;
};

type NFSeResposta = {
  cnpj_prestador: string;
  ref: string;
  numero_rps: string;
  serie_rps: string;
  tipo_rps: string;
  status: string;
  numero?: string;
  codigo_verificacao?: string;
  data_emissao?: string;
  url?: string;
  caminho_xml_nota_fiscal?: string;
  url_danfse?: string;
};

type NFSeRow = {
  id: string;
  ref: string;
  status: string;
  resposta: NFSeResposta | null;
  created_at: string;
};
type Perfil = {
  usuario_id: string | null;
  nome_completo: string | null;
  role: string | null;
  tipo_plano: string | null;
  cliente_id: string | null;
  ativo: boolean | null;
};

function statusBadge(status: ContratoRow["status"]) {
  const variants = {
    rascunho: "bg-slate-100 text-slate-700",
    ativo: "bg-green-100 text-green-700",
    suspenso: "bg-amber-100 text-amber-700",
    encerrado: "bg-red-100 text-red-700",
  };
  return variants[status] ?? "bg-slate-100 text-slate-700";
}

function statusLabel(status: ContratoRow["status"]) {
  const labels = {
    rascunho: "Rascunho",
    ativo: "Ativo",
    suspenso: "Suspenso",
    encerrado: "Encerrado",
  };
  return labels[status] ?? status;
}

async function downloadContratoPdf(contratoId: string, numeroContrato: string) {
  try {
    const response = await fetch(
      `/api/contrato/pdf-url?contratoId=${encodeURIComponent(contratoId)}`,
      { cache: "no-store" },
    );
    const data = (await response.json().catch(() => ({}))) as {
      url?: string;
      error?: string;
      debug?: Record<string, unknown>;
    };

    if (!response.ok || !data.url) {
      const debugMsg = data?.debug
        ? `\n\nDetalhes: ${JSON.stringify(data.debug)}`
        : "";
      throw new Error(
        data.error ||
          `Erro ao gerar URL do PDF (Status: ${response.status})${debugMsg}`,
      );
    }

    const link = document.createElement("a");
    link.href = data.url;
    link.download = `contrato-${numeroContrato}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    alert(
      `Erro: ${error instanceof Error ? error.message : "Erro ao baixar PDF"}`,
    );
  }
}

async function openContratoPdf(contratoId: string) {
  try {
    const response = await fetch(
      `/api/contrato/pdf-url?contratoId=${encodeURIComponent(contratoId)}`,
      { cache: "no-store" },
    );
    const data = (await response.json().catch(() => ({}))) as {
      url?: string;
      error?: string;
      debug?: Record<string, unknown>;
    };

    if (!response.ok || !data.url) {
      const debugMsg = data?.debug ? `\n\n${JSON.stringify(data.debug)}` : "";
      throw new Error(
        data.error ||
          `Erro ao abrir PDF (Status: ${response.status})${debugMsg}`,
      );
    }

    window.open(data.url, "_blank", "noopener,noreferrer");
  } catch (error) {
    alert(
      `Erro: ${error instanceof Error ? error.message : "Erro ao abrir PDF"}`,
    );
  }
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString("pt-BR");
  } catch {
    return value;
  }
}

export default function DashboardExpressDocumentosPage() {
  const [contratos, setContratos] = useState<ContratoRow[]>([]);
  const [nfse, setNfse] = useState<NFSeRow[]>([]);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        // Resolve canonical usuario via server
        const who = await fetch("/api/auth/whoami", {
          credentials: "include",
        });
        if (!who.ok) {
          setError("Usuário não autenticado.");
          return;
        }

        const perfilData = await who.json();

        if (!perfilData?.usuario_id || !perfilData?.cliente_id) {
          setError("Cliente não associado.");
          return;
        }
        setPerfil(perfilData);

        const [contratosRes, nfseRes] = await Promise.all([
          fetch(`/api/contrato/by-cliente?cliente_id=${perfilData.cliente_id}`),
          fetch(`/api/nfse/by-cliente?cliente_id=${perfilData.cliente_id}`),
        ]);

        const contratosData = await contratosRes.json();
        const nfseData = await nfseRes.json();

        setContratos(contratosData || []);
        setNfse(nfseData || []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao carregar documentos.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [perfil?.cliente_id, perfil?.usuario_id]);

  useEffect(() => {
    const pendentes = nfse.filter(
      (n) => n.status === "enviando" || n.status === "processando_autorizacao",
    );

    if (pendentes.length === 0) return;

    const timer = setTimeout(async () => {
      for (const nota of pendentes) {
        const res = await fetch(`/api/nfse/${nota.ref}`);
        const atualizado = await res.json();

        setNfse((prev) =>
          prev.map((n) =>
            n.ref === nota.ref
              ? { ...n, status: atualizado.status, resposta: atualizado }
              : n,
          ),
        );
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [nfse]);

  if (loading) {
    return (
      <section className="rounded-3xl border border-border bg-white p-4 sm:p-6 lg:p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <p className="text-slate-600">Carregando documentos...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-3xl border border-red-200 bg-red-50 p-4 sm:p-6 lg:p-8 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
          <div>
            <h2 className="font-semibold text-red-900">Erro ao carregar</h2>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="px-4 sm:px-5 lg:px-6 overflow-x-hidden">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        {/* HEADER */}
        <section className="rounded-3xl border border-border bg-white p-4 sm:p-6 lg:p-8 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <span className="inline-flex items-center rounded-full bg-brand/10 px-3 py-1 text-sm font-semibold text-brand">
                <FileText className="mr-2 h-4 w-4" />
                Documentos Express
              </span>

              <h1 className="mt-4 text-2xl sm:text-3xl font-semibold text-slate-900">
                Contratos e notas fiscais
              </h1>

              <p className="mt-2 text-sm text-slate-600 wrap-break-words">
                Veja seus contratos, notas fiscais e faça download dos
                documentos.
              </p>
            </div>

            <div className="grid gap-3 grid-cols-2 sm:grid-cols-2 w-full sm:w-auto">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-sm text-slate-500">Contratos</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {contratos.length}
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-sm text-slate-500">Notas fiscais</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {nfse.length}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CONTRATOS */}
        <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Contratos
              </h2>
              <p className="text-sm text-slate-500">
                Acesse e baixe os contratos disponíveis.
              </p>
            </div>
          </div>

          {contratos.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
              <FileText className="mx-auto mb-4 h-8 w-8" />
              <p className="font-semibold">Nenhum contrato encontrado</p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
              {contratos.map((contrato) => {
                const temPdf = Boolean(
                  contrato.pdf_assinado_url || contrato.pdf_url,
                );

                return (
                  <div
                    key={contrato.id}
                    className="rounded-2xl border border-border bg-white p-5 shadow-sm hover:shadow-md transition"
                  >
                    <div className="flex flex-col gap-4 min-w-0">
                      {/* INFO */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-900 truncate">
                            {contrato.numero_contrato}
                          </p>

                          <span
                            className={`text-xs px-2 py-1 rounded-full ${statusBadge(contrato.status)}`}
                          >
                            {statusLabel(contrato.status)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Calendar size={14} />
                          <span>Criado: {formatDate(contrato.criado_em)}</span>
                        </div>
                      </div>

                      {/* BOTÕES ✅ */}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            onClick={() => openContratoPdf(contrato.id)}
                            disabled={!temPdf}
                            className={`w-full sm:flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${temPdf ? "border border-slate-200 hover:bg-slate-50 text-slate-700" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}
                          >
                            <Eye size={16} />
                            Visualizar
                          </button>

                          <button
                            onClick={() =>
                              downloadContratoPdf(
                                contrato.id,
                                contrato.numero_contrato,
                              )
                            }
                            disabled={!temPdf}
                            className={`w-full sm:flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${temPdf ? "bg-brand text-white hover:brightness-95" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
                          >
                            <Download size={16} />
                            Baixar
                          </button>

                          {temPdf ? (
                            <Link
                              href={`/contrato/${contrato.id}`}
                              className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                            >
                              Detalhes
                            </Link>
                          ) : (
                            <span
                              className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-400 cursor-not-allowed bg-slate-100"
                              title="Detalhes disponíveis após geração do contrato"
                            >
                              Detalhes
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* NFSe */}
        <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-xl font-semibold text-slate-900">
              Notas fiscais
            </h2>

            {nfse.length > 0 && (
              <button
                onClick={async () => {
                  const res = await fetch(
                    `/api/nfse/by-cliente?cliente_id=${perfil?.cliente_id}`,
                  );
                  const data = await res.json();
                  setNfse(data);
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
              >
                <RefreshCw size={16} />
                Atualizar
              </button>
            )}
          </div>

          {nfse.length === 0 ? (
            <div className="mt-6 text-center text-slate-500">
              Nenhuma nota fiscal
            </div>
          ) : (
            <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
              {nfse.map((nota) => (
                <div
                  key={nota.id}
                  className="rounded-2xl border border-border bg-white p-5"
                >
                  <div className="space-y-3">
                    <p className="font-semibold text-slate-900 truncate">
                      NFSe #{nota.resposta?.numero ?? "-"}
                    </p>
                    <p className="text-sm">
                      Status:{" "}
                      <span
                        className={
                          nota.status === "autorizado"
                            ? "text-green-600"
                            : nota.status === "erro" ||
                                nota.status === "erro_autorizacao"
                              ? "text-red-600"
                              : "text-yellow-600"
                        }
                      >
                        {nota.status}
                      </span>
                    </p>
                    <div className="flex flex-col gap-2">
                      <button className="w-full rounded-lg border px-3 py-2 text-sm">
                        Atualizar
                      </button>

                      <button className="w-full rounded-lg border px-3 py-2 text-sm">
                        Ver nota
                      </button>

                      <button className="w-full rounded-lg bg-brand text-white px-3 py-2 text-sm">
                        PDF
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
