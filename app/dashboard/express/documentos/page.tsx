"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/browser";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const { data } = await supabase.auth.getSession();
        if (!data.session?.user?.id) {
          setError("Usuário não autenticado.");
          return;
        }

        const { data: usuario, error: usuarioError } = await supabase
          .from("usuarios")
          .select("cliente_id")
          .eq("id", data.session.user.id)
          .single();

        if (usuarioError || !usuario?.cliente_id) {
          setError("Cliente não associado.");
          return;
        }

        const [
          { data: contratosData, error: contratosError },
          { data: nfseData, error: nfseError },
        ] = await Promise.all([
          supabase
            .from("contratos")
            .select(
              "id,numero_contrato,versao,status,criado_em,atualizado_em,pdf_url,pdf_assinado_url,tipo_contrato",
            )
            .eq("cliente_id", usuario.cliente_id)
            .order("criado_em", { ascending: false }),
          supabase
            .from("nfse_emissoes")
            .select("id, ref, status, resposta, created_at")
            .eq("cliente_id", usuario.cliente_id)
            .order("created_at", { ascending: false }),
        ]);

        if (contratosError) throw contratosError;
        if (nfseError) throw nfseError;

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
  }, []);

  if (loading) {
    return (
      <section className="rounded-3xl border border-border bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <p className="text-slate-600">Carregando documentos...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm">
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
    <div className="space-y-6">
      <section className="rounded-3xl border border-border bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="inline-flex items-center rounded-full bg-brand/10 px-3 py-1 text-sm font-semibold text-brand">
              <FileText className="mr-2 h-4 w-4" />
              Documentos Express
            </span>
            <h1 className="mt-4 text-3xl font-semibold text-slate-900">
              Contratos e notas fiscais
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Veja seus contratos, notas fiscais e faça download dos documentos.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Contratos</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {contratos.length}
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Notas fiscais</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {nfse.length}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="contratos"
        className="rounded-3xl border border-border bg-white p-6 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Contratos</h2>
            <p className="mt-1 text-sm text-slate-500">
              Acesse os contratos e baixe o PDF quando
              estiver disponível.
            </p>
          </div>
          {contratos.length > 0 && (
            <Link
              href="#contratos"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Ver contratos
            </Link>
          )}
        </div>

        {contratos.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
            <FileText className="mx-auto mb-4 h-8 w-8" />
            <p className="font-semibold">Nenhum contrato encontrado</p>
            <p className="mt-2 text-sm">
              Sua empresa ainda não possui contratos cadastrados.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            {contratos.map((contrato) => {
              const temPdf = Boolean(
                contrato.pdf_assinado_url || contrato.pdf_url,
              );
              return (
                <div
                  key={contrato.id}
                  className="rounded-2xl border border-border bg-white p-5 shadow-sm hover:shadow-md transition"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="font-semibold text-slate-900">
                          {contrato.numero_contrato}
                        </p>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge(contrato.status)}`}
                        >
                          {statusLabel(contrato.status)}
                        </span>
                        {contrato.versao > 1 && (
                          <span className="text-xs text-slate-500">
                            v{contrato.versao}
                          </span>
                        )}
                      </div>

                      <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-slate-400" />
                          <span>Criado: {formatDate(contrato.criado_em)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-slate-400" />
                          <span>
                            Atualizado: {formatDate(contrato.atualizado_em)}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600">
                        Tipo: {contrato.tipo_contrato}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {temPdf ? (
                        <>
                          <button
                            type="button"
                            onClick={() => openContratoPdf(contrato.id)}
                            className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <Eye size={16} />
                            Visualizar
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              downloadContratoPdf(
                                contrato.id,
                                contrato.numero_contrato,
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand/90"
                          >
                            <Download size={16} />
                            Baixar
                          </button>
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-500">
                          <AlertCircle size={16} />
                          PDF não disponível
                        </span>
                      )}

                      <Link
                        href={`/contrato/${contrato.id}`}
                        className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Detalhes
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Notas fiscais
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Acompanhe as emissões e acesse o PDF das notas fiscais.
            </p>
          </div>
          {nfse.length > 0 && (
            <button
              type="button"
              onClick={() => location.reload()}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              <RefreshCw size={16} />
              Atualizar lista
            </button>
          )}
        </div>

        {nfse.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
            <AlertCircle className="mx-auto mb-4 h-8 w-8" />
            <p className="font-semibold">Nenhuma nota fiscal emitida</p>
            <p className="mt-2 text-sm">
              Quando houver emissões, elas aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            {nfse.map((nota) => {
              const resposta = nota.resposta;
              return (
                <div
                  key={nota.id}
                  className="rounded-2xl border border-border bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="font-semibold text-slate-900">
                          NFSe #{resposta?.numero ?? "-"}
                        </p>
                        <span className="text-xs text-slate-500">
                          Ref: {nota.ref}
                        </span>
                      </div>
                      <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                        <span>
                          Emissão:{" "}
                          {resposta?.data_emissao
                            ? formatDate(resposta.data_emissao)
                            : formatDate(nota.created_at)}
                        </span>
                        {resposta?.codigo_verificacao ? (
                          <span>
                            Verificação: {resposta.codigo_verificacao}
                          </span>
                        ) : null}
                      </div>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          nota.status === "autorizado"
                            ? "bg-green-50 text-green-700"
                            : nota.status === "erro_autorizacao"
                              ? "bg-red-50 text-red-700"
                              : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {nota.status === "autorizado"
                          ? "Autorizada"
                          : nota.status === "processando_autorizacao"
                            ? "Processando"
                            : "Erro"}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await fetch(`/api/nfse/${nota.ref}`);
                          location.reload();
                        }}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                      >
                        Atualizar
                      </button>
                      {resposta?.url && (
                        <button
                          type="button"
                          onClick={() => window.open(resposta.url, "_blank")}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        >
                          Ver nota
                        </button>
                      )}
                      {resposta?.url_danfse && (
                        <button
                          type="button"
                          onClick={() =>
                            window.open(resposta.url_danfse, "_blank")
                          }
                          className="rounded-lg bg-brand text-white px-3 py-2 text-sm"
                        >
                          PDF
                        </button>
                      )}
                      {resposta?.caminho_xml_nota_fiscal && (
                        <button
                          type="button"
                          onClick={() =>
                            window.open(
                              resposta.caminho_xml_nota_fiscal!,
                              "_blank",
                            )
                          }
                          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        >
                          XML
                        </button>
                      )}

                      {/* ✅ NOVO BOTÃO EMAIL */}
                      {nota.status === "autorizado" && (
                        <button
                          type="button"
                          onClick={async () => {
                            const res = await fetch(
                              `/api/nfse/email/${nota.ref}/email`,
                              {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ tipo: "manual" }),
                              },
                            );
                            const j = await res.json().catch(() => ({}));
                            if (!res.ok)
                              alert(j.error ?? "Erro ao enviar email");
                            else alert("E-mail agendado para envio ✅");
                          }}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                        >
                          Enviar por e-mail
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
