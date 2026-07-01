"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
  pdf_status: string | null;
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
  } as const;
  return (
    (variants as Record<string, string>)[status] ??
    "bg-slate-100 text-slate-700"
  );
}

function statusLabel(status: ContratoRow["status"]) {
  const labels = {
    rascunho: "Rascunho",
    ativo: "Ativo",
    suspenso: "Suspenso",
    encerrado: "Encerrado",
  } as const;
  return (labels as Record<string, string>)[status] ?? status;
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
  const [pdfTimedOut, setPdfTimedOut] = useState(false);
  const pollCountRef = useRef(0);
  const nfsePollCountRef = useRef(0);

  const fetchDados = async (clienteId: string) => {
    const [contratosRes, nfseRes] = await Promise.all([
      fetch(`/api/contrato/by-cliente?cliente_id=${clienteId}`, {
        credentials: "include",
      }),
      fetch(`/api/nfse/by-cliente?cliente_id=${clienteId}`, {
        credentials: "include",
      }),
    ]);

    let contratosData: ContratoRow[] = [];
    if (contratosRes.ok) {
      const parsed = await contratosRes.json();
      contratosData = Array.isArray(parsed) ? parsed : [];
    }
    setContratos(contratosData);

    let nfseData: NFSeRow[] = [];
    if (nfseRes.ok) {
      const parsed = await nfseRes.json();
      const raw: NFSeRow[] = Array.isArray(parsed) ? parsed : [];
      // resposta pode vir como string JSON (coluna text) ou objeto (jsonb) — normaliza
      nfseData = raw.map((n) => ({
        ...n,
        resposta:
          typeof n.resposta === "string"
            ? (() => {
                try {
                  return JSON.parse(
                    n.resposta as unknown as string,
                  ) as NFSeResposta;
                } catch {
                  return null;
                }
              })()
            : n.resposta,
      }));
    }
    setNfse(nfseData);

    return contratosData;
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const who = await fetch("/api/auth/whoami", { credentials: "include" });
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

        await fetchDados(perfilData.cliente_id);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao carregar documentos.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Poll enquanto houver PDF pendente/processando (máx. 10 tentativas)
  useEffect(() => {
    const hasPending = contratos.some(
      (c) =>
        !c.pdf_url &&
        !c.pdf_assinado_url &&
        (c.pdf_status === "pending" || c.pdf_status === "processing"),
    );
    if (!hasPending || !perfil?.cliente_id) return;

    pollCountRef.current = 0;

    const timer = setInterval(async () => {
      pollCountRef.current += 1;
      const dados = await fetchDados(perfil.cliente_id!);
      const stillPending = dados.some(
        (c) =>
          !c.pdf_url &&
          !c.pdf_assinado_url &&
          (c.pdf_status === "pending" || c.pdf_status === "processing"),
      );
      if (!stillPending || pollCountRef.current >= 10) {
        clearInterval(timer);
        if (stillPending && pollCountRef.current >= 10) setPdfTimedOut(true);
        else setPdfTimedOut(false);
      }
    }, 6000);

    return () => clearInterval(timer);
  }, [contratos, perfil?.cliente_id]);

  // Poll NFSe enquanto houver notas pendentes (máx. 20 tentativas, a cada 10s)
  // Cada iteração re-checa individualmente no FocusNFE antes de atualizar a lista
  const nfseStatusKey = nfse.map((n) => n.ref + n.status).join();
  useEffect(() => {
    const pendingRefs = nfse
      .filter(
        (n) =>
          n.status === "enviando" || n.status === "processando_autorizacao",
      )
      .map((n) => n.ref);

    if (pendingRefs.length === 0 || !perfil?.cliente_id) return;

    nfsePollCountRef.current = 0;

    const timer = setInterval(async () => {
      nfsePollCountRef.current += 1;

      // Re-checa cada nota pendente no FocusNFE e atualiza estado local
      // NÃO chama fetchDados — evita sobrescrever o status com valor desatualizado do banco
      let anyStillPending = false;

      await Promise.all(
        pendingRefs.map(async (ref) => {
          try {
            const res = await fetch(`/api/nfse/${encodeURIComponent(ref)}`, {
              credentials: "include",
            });
            if (res.ok) {
              const updated = (await res.json()) as {
                status?: string;
                [k: string]: unknown;
              };
              const newStatus = updated.status ?? "processando_autorizacao";
              // normaliza: FocusNFE retorna "autorizado", DB armazena como "emitida"
              const normalizedStatus =
                newStatus === "autorizado" ? "emitida" : newStatus;
              if (
                normalizedStatus === "enviando" ||
                normalizedStatus === "processando_autorizacao"
              ) {
                anyStillPending = true;
              }
              setNfse((prev) =>
                prev.map((n) =>
                  n.ref === ref
                    ? {
                        ...n,
                        status: normalizedStatus,
                        resposta: updated as NFSeResposta,
                      }
                    : n,
                ),
              );
            } else {
              anyStillPending = true;
            }
          } catch {
            anyStillPending = true;
          }
        }),
      );

      if (!anyStillPending || nfsePollCountRef.current >= 20) {
        clearInterval(timer);
      }
    }, 10_000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nfseStatusKey, perfil?.cliente_id]);

  const hasPendingNfse = nfse.some(
    (n) => n.status === "enviando" || n.status === "processando_autorizacao",
  );
  const temContratoAtivoPago = contratos.some((c) => c.status === "ativo");
  // Aguardando: sem NFSe OU todas em estado terminal (emitida/erro) mas nenhuma ainda aparecendo
  const nfseAguardando = nfse.length === 0 && temContratoAtivoPago;

  // Poll quando nfse está vazia mas há contratos ativos — detecta NFSe criada após o carregamento da página
  useEffect(() => {
    if (!nfseAguardando || !perfil?.cliente_id) return;
    const timer = setInterval(() => {
      fetchDados(perfil.cliente_id!);
    }, 10_000);
    return () => clearInterval(timer);
  }, [nfseAguardando, perfil?.cliente_id]);

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
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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

            <div className="grid gap-3 grid-cols-2 w-full md:w-auto md:shrink-0">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-sm text-slate-500">Contratos ativos</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {contratos.filter((c) => c.status === "ativo").length}
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

          {contratos.filter((c) => c.status === "ativo").length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
              <FileText className="mx-auto mb-4 h-8 w-8" />
              <p className="font-semibold">Nenhum contrato ativo encontrado</p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {contratos
                .filter((c) => c.status === "ativo")
                .map((contrato) => {
                  const temPdf = Boolean(
                    contrato.pdf_assinado_url || contrato.pdf_url,
                  );
                  const pdfStillPending =
                    !temPdf &&
                    (contrato.pdf_status === "pending" ||
                      contrato.pdf_status === "processing");
                  const pdfPending = pdfStillPending && !pdfTimedOut;
                  const pdfMessage = temPdf
                    ? null
                    : pdfPending
                      ? "PDF sendo gerado, aguarde alguns instantes..."
                      : `PDF ainda não disponível. Será gerado em instantes após a confirmação do pagamento. Se o problema persistir, entre em contato com o suporte.`;

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
                            <span>
                              Criado: {formatDate(contrato.criado_em)}
                            </span>
                          </div>
                        </div>

                        {/* BOTÕES */}
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => openContratoPdf(contrato.id)}
                            disabled={!temPdf}
                            title={
                              temPdf
                                ? "Visualizar contrato (abre em nova aba)"
                                : pdfPending
                                  ? "PDF sendo gerado..."
                                  : (pdfMessage ?? undefined)
                            }
                            aria-disabled={!temPdf}
                            className={`flex-1 min-w-22.5 inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-semibold ${temPdf ? "border border-slate-200 hover:bg-slate-50 text-slate-700" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}
                          >
                            {pdfPending ? (
                              <>
                                <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                                <span className="truncate">Gerando...</span>
                              </>
                            ) : (
                              <>
                                <Eye size={15} />
                                <span className="truncate">Visualizar</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() =>
                              downloadContratoPdf(
                                contrato.id,
                                contrato.numero_contrato,
                              )
                            }
                            disabled={!temPdf}
                            title={
                              temPdf
                                ? "Baixar contrato"
                                : pdfPending
                                  ? "PDF sendo gerado..."
                                  : (pdfMessage ?? undefined)
                            }
                            aria-disabled={!temPdf}
                            className={`flex-1 min-w-20 inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-semibold ${temPdf ? "bg-brand text-white hover:brightness-95" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
                          >
                            <Download size={15} />
                            <span className="truncate">Baixar</span>
                          </button>

                          <Link
                            href={`/contrato/${contrato.id}`}
                            className="flex-1 min-w-20 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-sm font-semibold hover:bg-slate-50"
                          >
                            <span className="truncate">Detalhes</span>
                          </Link>
                        </div>

                        {!temPdf && (
                          <p className="mt-2 text-xs text-slate-500">
                            {pdfTimedOut && pdfStillPending
                              ? "A geração do PDF está demorando mais que o esperado. "
                              : pdfMessage + " "}
                            {pdfTimedOut && pdfStillPending ? (
                              <button
                                onClick={async () => {
                                  pollCountRef.current = 0;
                                  setPdfTimedOut(false);
                                  // Re-trigger PDF generation
                                  try {
                                    await fetch("/api/contrato/retentar-pdf", {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                      },
                                      credentials: "include",
                                      body: JSON.stringify({
                                        contratoId: contrato.id,
                                      }),
                                    });
                                  } catch {
                                    // ignore — polling will pick up any change
                                  }
                                  if (perfil?.cliente_id)
                                    fetchDados(perfil.cliente_id);
                                }}
                                className="font-medium text-brand hover:underline"
                              >
                                Verificar novamente
                              </button>
                            ) : (
                              <a
                                href={"/contato"}
                                target="_blank"
                                rel="noreferrer"
                                className="font-medium text-brand hover:underline"
                              >
                                Contatar suporte
                              </a>
                            )}
                          </p>
                        )}
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
                  if (perfil?.cliente_id) await fetchDados(perfil.cliente_id);
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
              >
                <RefreshCw size={16} />
                Atualizar lista
              </button>
            )}
          </div>

          {hasPendingNfse && (
            <p className="mt-3 text-sm text-slate-500">
              Algumas notas estão sendo processadas — atualizando
              automaticamente a cada 10s.
            </p>
          )}

          {nfse.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
              <FileText className="mx-auto mb-3 h-8 w-8" />
              {nfseAguardando ? (
                <>
                  <p className="font-semibold">Nota fiscal em preparação</p>
                  <p className="mt-1 text-sm">
                    Será emitida após a confirmação do pagamento e aparecerá
                    aqui automaticamente.
                  </p>
                  <button
                    onClick={() => {
                      if (perfil?.cliente_id) fetchDados(perfil.cliente_id);
                    }}
                    className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline"
                  >
                    <RefreshCw size={14} />
                    Verificar agora
                  </button>
                </>
              ) : (
                <p className="font-semibold">Nenhuma nota fiscal</p>
              )}
            </div>
          ) : (
            <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {nfse.map((nota) => {
                const isAutorizada =
                  nota.status === "emitida" || nota.status === "autorizado";
                const isErro =
                  nota.status === "erro" || nota.status === "erro_autorizacao";
                const canUpdate = !isAutorizada && !isErro;
                const canView = Boolean(
                  nota.resposta?.url ||
                  nota.resposta?.url_danfse ||
                  nota.resposta?.caminho_xml_nota_fiscal ||
                  nota.resposta?.codigo_verificacao,
                );
                const canPdf =
                  isAutorizada &&
                  (nota.resposta?.url_danfse || nota.resposta?.url);

                return (
                  <div
                    key={nota.id}
                    className="rounded-2xl border border-border bg-white p-5 shadow-sm hover:shadow-md transition"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <p className="font-semibold text-slate-900 truncate">
                          NFSe #{nota.resposta?.numero ?? "-"}
                        </p>
                        <span
                          className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-semibold ${
                            isAutorizada
                              ? "bg-green-100 text-green-700"
                              : isErro
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {isAutorizada
                            ? "Autorizada"
                            : isErro
                              ? "Erro"
                              : nota.status === "processando_autorizacao"
                                ? "Processando"
                                : nota.status === "enviando"
                                  ? "Enviando"
                                  : nota.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/nfse/${nota.ref}`);
                              const atualizado = await res.json();
                              setNfse((prev) =>
                                prev.map((n) =>
                                  n.ref === nota.ref
                                    ? {
                                        ...n,
                                        status: atualizado.status,
                                        resposta: atualizado,
                                      }
                                    : n,
                                ),
                              );
                            } catch {
                              alert("Erro ao atualizar nota fiscal");
                            }
                          }}
                          disabled={!canUpdate}
                          aria-disabled={!canUpdate}
                          title={
                            canUpdate
                              ? "Rechecar nota"
                              : "Rechecar indisponível"
                          }
                          aria-label={
                            canUpdate
                              ? "Rechecar nota"
                              : "Rechecar indisponível"
                          }
                          className={`shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg border ${
                            canUpdate
                              ? "hover:bg-slate-50"
                              : "bg-slate-100 text-slate-400 cursor-not-allowed"
                          }`}
                        >
                          <RefreshCw size={15} />
                        </button>

                        <button
                          onClick={() => {
                            const url =
                              nota.resposta?.url_danfse ||
                              nota.resposta?.url ||
                              nota.resposta?.caminho_xml_nota_fiscal;
                            if (url)
                              window.open(url, "_blank", "noopener,noreferrer");
                          }}
                          disabled={!canView}
                          aria-disabled={!canView}
                          title={
                            canView
                              ? "Abrir documento da nota fiscal"
                              : "Documento não disponível"
                          }
                          className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-sm font-semibold ${
                            canView
                              ? "hover:bg-slate-50 text-slate-700"
                              : "bg-slate-100 text-slate-400 cursor-not-allowed"
                          }`}
                        >
                          <span className="truncate">Ver nota</span>
                        </button>

                        <button
                          onClick={() => {
                            const pdf =
                              nota.resposta?.url_danfse || nota.resposta?.url;
                            if (pdf)
                              window.open(pdf, "_blank", "noopener,noreferrer");
                          }}
                          disabled={!canPdf}
                          aria-disabled={!canPdf}
                          title={
                            canPdf
                              ? "Abrir/baixar PDF da NFSe"
                              : "PDF não disponível"
                          }
                          className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-semibold ${
                            canPdf
                              ? "bg-brand text-white"
                              : "bg-slate-200 text-slate-400 cursor-not-allowed"
                          }`}
                        >
                          <span className="truncate">PDF</span>
                        </button>
                      </div>

                      {/* Friendly error message and helpful links when NFSe failed */}
                      {(nota.status === "erro" ||
                        nota.status === "erro_autorizacao") && (
                        <div className="mt-1">
                          <p className="mt-2 text-sm text-slate-500">
                            Algumas notas não puderam ser processadas no
                            momento. Tente novamente mais tarde ou contate o
                            suporte se precisar de ajuda.
                            {nota.resposta?.codigo_verificacao ? (
                              <span className="block mt-1 text-xs text-slate-500">
                                Código: {nota.resposta.codigo_verificacao}
                              </span>
                            ) : null}
                          </p>

                          <div className="mt-2 flex flex-wrap gap-2 text-sm">
                            {nota.resposta?.caminho_xml_nota_fiscal ? (
                              <a
                                href={nota.resposta.caminho_xml_nota_fiscal}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm text-slate-700 underline"
                              >
                                Baixar XML
                              </a>
                            ) : null}

                            {nota.resposta?.url_danfse ? (
                              <a
                                href={nota.resposta.url_danfse}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm text-slate-700 underline"
                              >
                                Ver DANFSe
                              </a>
                            ) : null}

                            <a
                              href={"/contato"}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-brand hover:underline"
                            >
                              Contatar suporte
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
