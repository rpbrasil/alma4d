"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { Download, Eye, Calendar, FileText, AlertCircle } from "lucide-react";

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

function statusBadge(status: "rascunho" | "ativo" | "suspenso" | "encerrado") {
  const variants = {
    rascunho: "bg-slate-100 text-slate-700",
    ativo: "bg-green-100 text-green-700",
    suspenso: "bg-amber-100 text-amber-700",
    encerrado: "bg-red-100 text-red-700",
  };
  return variants[status];
}

function statusLabel(status: "rascunho" | "ativo" | "suspenso" | "encerrado") {
  const labels = {
    rascunho: "Rascunho",
    ativo: "Ativo",
    suspenso: "Suspenso",
    encerrado: "Encerrado",
  };
  return labels[status];
}

async function downloadPdf(contratoId: string, numeroContrato: string) {
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

export default function DashboardExpressContratoPage() {
  const [contratos, setContratos] = useState<ContratoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data } = await supabase.auth.getSession();
        if (!data.session?.user?.id) {
          setError("Usuário não autenticado.");
          return;
        }

        const { data: usuario, error: userError } = await supabase
          .from("usuarios")
          .select("cliente_id")
          .eq("id", data.session.user.id)
          .single();

        if (userError || !usuario?.cliente_id) {
          setError("Cliente não associado.");
          return;
        }

        const { data: contratosData, error: contratosError } = await supabase
          .from("contratos")
          .select(
            "id,numero_contrato,versao,status,criado_em,atualizado_em,pdf_url,pdf_assinado_url,tipo_contrato",
          )
          .eq("cliente_id", usuario.cliente_id)
          .order("criado_em", { ascending: false });

        if (contratosError) throw contratosError;
        setContratos(contratosData || []);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao carregar contratos.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase]);

  if (loading) {
    return (
      <section className="rounded-3xl border border-border bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <p className="text-slate-600">Carregando contratos...</p>
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

  if (contratos.length === 0) {
    return (
      <section className="rounded-3xl border border-border bg-white p-8 shadow-sm">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 text-slate-300" />
          <h2 className="mt-4 font-semibold text-slate-700">Nenhum contrato</h2>
          <p className="mt-1 text-sm text-slate-500">
            Ainda não há contratos associados a esta conta.
          </p>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Meus Contratos
            </h1>
            <p className="mt-1 text-slate-600">
              {contratos.length} contrato{contratos.length !== 1 ? "s" : ""}{" "}
              associado{contratos.length !== 1 ? "s" : ""}
            </p>
          </div>
          <FileText className="h-12 w-12 text-brand/20" />
        </div>
      </section>

      <div className="grid gap-4">
        {contratos.map((contrato) => {
          const temPdf = Boolean(contrato.pdf_assinado_url || contrato.pdf_url);
          return (
            <div
              key={contrato.id}
              className="rounded-2xl border border-border bg-white p-5 shadow-sm hover:shadow-md transition"
            >
              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
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

                  <div className="grid gap-2 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-slate-400" />
                      <span>
                        Criado:{" "}
                        {new Date(contrato.criado_em).toLocaleDateString(
                          "pt-BR",
                        )}
                      </span>
                    </div>
                    {contrato.criado_em !== contrato.atualizado_em && (
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-slate-400" />
                        <span>
                          Atualizado:{" "}
                          {new Date(contrato.atualizado_em).toLocaleDateString(
                            "pt-BR",
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {temPdf ? (
                    <>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const response = await fetch(
                              `/api/contrato/pdf-url?contratoId=${encodeURIComponent(contrato.id)}`,
                              { cache: "no-store" },
                            );
                            const data = (await response
                              .json()
                              .catch(() => ({}))) as {
                              url?: string;
                              error?: string;
                              debug?: Record<string, unknown>;
                            };

                            if (!response.ok || !data.url) {
                              const debugMsg = data?.debug
                                ? `\n${JSON.stringify(data.debug)}`
                                : "";
                              throw new Error(
                                data.error ||
                                  `Erro (${response.status})${debugMsg}`,
                              );
                            }

                            window.open(
                              data.url,
                              "_blank",
                              "noopener,noreferrer",
                            );
                          } catch (err) {
                            alert(
                              `Erro ao visualizar: ${err instanceof Error ? err.message : "Erro desconhecido"}`,
                            );
                          }
                        }}
                        className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-surface-muted transition"
                      >
                        <Eye size={16} />
                        Visualizar
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          downloadPdf(contrato.id, contrato.numero_contrato)
                        }
                        className="inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand/90 transition"
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
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-surface-muted transition"
                  >
                    Detalhes
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
