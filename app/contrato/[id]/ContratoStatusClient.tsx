"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";

type ContratoRow = {
  id: string;
  cliente_id: string;
  numero_contrato: string;
  versao: number;
  status: "rascunho" | "ativo" | "suspenso" | "encerrado";
  tipo_contrato: string;

  criado_em: string;
  atualizado_em: string;

  pdf_url: string | null;
  pdf_assinado_url: string | null;
  forma_pagamento: string | null;

  aceite_termos: boolean | null;
  aceite_termos_em: string | null;
  aceite_ip: string | null;
  versao_termos: string | null;
  aceite_user_agent: string | null;
};

type PagamentoInfo = {
  order_id: string;
  status?: string | null; // paid|pending|failed|canceled|...
  amount?: number | null;
  method?: string | null; // pix|boleto
};

type StatusPayload = {
  contrato: ContratoRow;
  pagamento: PagamentoInfo | null;
  error?: string;
};

type ContratoEvento = {
  id: string;
  tipo: string;
  dados: Record<string, unknown> | null;
  created_at: string;
};

function Badge({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "err" | "info";
  children: React.ReactNode;
}) {
  const cls =
    tone === "ok"
      ? "bg-green-50 border-green-200 text-green-700"
      : tone === "warn"
        ? "bg-amber-50 border-amber-200 text-amber-800"
        : tone === "err"
          ? "bg-red-50 border-red-200 text-red-700"
          : "bg-slate-50 border-slate-200 text-slate-700";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}
    >
      {children}
    </span>
  );
}

function fmtBRLFromCents(cents?: number | null) {
  if (!cents && cents !== 0) return "—";
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function humanizeEvento(tipo: string) {
  switch (tipo) {
    case "webhook_recebido":
      return "Webhook recebido";
    case "pagamento_confirmado":
      return "Pagamento confirmado";
    case "contrato_ativado":
      return "Contrato ativado";
    case "pdf_gerado":
      return "PDF do contrato gerado";
    default:
      return tipo.replaceAll("_", " ");
  }
}
export default function ContratoStatusClient({
  contratoId,
}: {
  contratoId: string;
}) {
  const [data, setData] = useState<StatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const pollMs = useMemo(() => 5000, []);
  const [eventos, setEventos] = useState<ContratoEvento[]>([]);
  const [eventosLoading, setEventosLoading] = useState(false);

  const loadEventos = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setEventosLoading(true);
        const r = await fetch(
          `/api/contrato/eventos?contratoId=${encodeURIComponent(contratoId)}`,
          {
            cache: "no-store",
            signal,
          },
        );
        const j = (await r.json().catch(() => null)) as {
          eventos?: ContratoEvento[];
        } | null;
        if (!r.ok || !j?.eventos) return;
        setEventos(j.eventos);
      } finally {
        setEventosLoading(false);
      }
    },
    [contratoId],
  );
  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const qs = new URLSearchParams();
        qs.set("contratoId", contratoId);

        const r = await fetch(`/api/contrato/status?${qs.toString()}`, {
          cache: "no-store",
          signal,
        });

        const j = (await r.json().catch(() => null)) as StatusPayload | null;

        if (!r.ok || !j) throw new Error("Não foi possível carregar o status.");

        setData(j);
        setErr(null);
      } catch (e) {
        // se foi abort, não atualiza nada
        if (e instanceof DOMException && e.name === "AbortError") return;

        setErr(e instanceof Error ? e.message : "Erro ao carregar status.");
      } finally {
        setLoading(false);
      }
    },
    [contratoId],
  );
  const firstKey = `contrato:first:${contratoId}`;
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(firstKey);

      if (!seen) {
        window.setTimeout(() => {
          setIsFirstVisit(true);
        }, 0);

        localStorage.setItem(firstKey, "1");
      }
    } catch {
      // ignore
    }
  }, [firstKey]);

  useEffect(() => {
    let mounted = true;
    const ac = new AbortController();

    // chamada inicial “assíncrona” (evita setState sincronamente no effect body)
    const first = window.setTimeout(() => {
      if (!mounted) return;
      void load(ac.signal);
      void loadEventos(ac.signal);
    }, 0);

    const interval = window.setInterval(() => {
      if (!mounted) return;

      // opcional: evitar polling quando aba está escondida
      if (document.visibilityState === "hidden") return;
      void loadEventos(ac.signal);
      void load(ac.signal);
    }, pollMs);

    return () => {
      mounted = false;
      window.clearTimeout(first);
      window.clearInterval(interval);
      ac.abort();
    };
  }, [load, loadEventos, pollMs]);

  const contrato = data?.contrato ?? null;
  const pagamento = data?.pagamento ?? null;

  const normalizedStatus = (pagamento?.status || "")
    .toString()
    .trim()
    .toLowerCase();

  const paid = normalizedStatus === "paid" || contrato?.status === "ativo";

  const failed =
    normalizedStatus === "failed" || normalizedStatus === "canceled";

  const pending = !paid && !failed;
  const contratoPdf = contrato?.pdf_assinado_url ?? contrato?.pdf_url ?? null;
  const steps = [
    {
      id: "pago",
      title: "Confirmar pagamento",
      done: paid || contrato?.status === "ativo",
      cta: !paid ? "Atualizar status" : null,
      onClick: () => void load(),
    },
    {
      id: "pdf",
      title: "Baixar contrato (PDF)",
      done: Boolean(contratoPdf),
      cta: contratoPdf ? "Baixar PDF" : "Aguardando PDF",
      href: contratoPdf ?? undefined,
    },
    {
      id: "app",
      title: "Acessar sistema e ver relatórios",
      done: contrato?.status === "ativo",
      cta:
        contrato?.status === "ativo"
          ? "Entrar no sistema"
          : "Liberado após ativação",
      href: contrato?.status === "ativo" ? "/dashboard" : undefined,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const progressPct = Math.round((doneCount / steps.length) * 100);
  const openPdf = async () => {
    try {
      const r = await fetch(
        `/api/contrato/pdf-url?contratoId=${encodeURIComponent(contratoId)}`,
        {
          cache: "no-store",
        },
      );
      const j = (await r.json().catch(() => null)) as {
        url?: string;
        error?: string;
      } | null;

      if (!r.ok || !j?.url) {
        throw new Error(j?.error || "Não foi possível obter o link do PDF.");
      }

      window.open(j.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao abrir PDF.");
    }
  };

  const downloadPdf = async () => {
    try {
      const r = await fetch(
        `/api/contrato/pdf-url?contratoId=${encodeURIComponent(contratoId)}`,
        {
          cache: "no-store",
        },
      );
      const j = (await r.json().catch(() => null)) as {
        url?: string;
        error?: string;
      } | null;

      if (!r.ok || !j?.url) {
        throw new Error(j?.error || "Não foi possível obter o link do PDF.");
      }

      const a = document.createElement("a");
      a.href = j.url;
      a.download = `contrato-${contratoId}.pdf`; // nome sugerido
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao baixar PDF.");
    }
  };

  return (
    <main className="min-h-screen bg-surface-muted">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header: texto à esquerda + logo à direita */}
        <header className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span className="inline-flex h-2 w-2 rounded-full bg-brand-secondary" />
              Pós‑pagamento • Contrato NR‑1
            </div>

            <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-brand tracking-tight">
              Contrato e confirmação de pagamento
            </h1>

            <p className="mt-2 text-sm sm:text-base text-slate-600">
              Guarde esta página: ela mostra o status do pagamento e libera o
              contrato e seu acesso ao aplicativo.
            </p>
          </div>

          <div className="shrink-0 flex items-start">
            <Image
              src="/images/alma4d_express_nobground.png"
              alt="alma4D"
              width={92}
              height={92}
              className="opacity-90"
              priority
            />
          </div>
        </header>
        {isFirstVisit && (
          <div className="rounded-xl border border-brand-secondary/20 bg-brand-secondary/10 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-800">Bem‑vindo(a)! 👋</p>
            <p className="mt-1">
              Esta é sua central do contrato. Aqui você confirma o pagamento,
              baixa o PDF e entra no sistema para acessar relatórios.
            </p>
          </div>
        )}
        {/* Conteúdo */}
        <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
          {/* Card principal */}
          <div className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Status do pagamento
                </p>

                {paid && <Badge tone="ok">Pago</Badge>}
                {pending && <Badge tone="warn">Pendente</Badge>}
                {failed && <Badge tone="err">Não confirmado</Badge>}
              </div>{" "}
            </div>

            {/* Dicas práticas Pix vs boleto */}
            {pending && (
              <div className="mt-4 rounded-xl bg-surface-muted p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-800">E agora?</p>
                <ul className="mt-2 list-disc pl-5 space-y-1">
                  <li>
                    <strong>Pix</strong>: normalmente confirma rápido (minutos).
                  </li>
                  <li>
                    <strong>Boleto</strong>: pode levar até{" "}
                    <strong>1 dia útil</strong> para confirmar (conciliação
                    bancária).
                  </li>
                  <li>
                    O contrato PDF final aparece automaticamente aqui quando o
                    webhook concluir a geração.
                  </li>
                </ul>
              </div>
            )}

            {/* Ações */}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void load()}
                className="inline-flex items-center justify-center rounded-xl border border-border bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-surface-muted"
              >
                Atualizar agora
              </button>

              <a
                href={`/api/contrato/preview?contratoId=${encodeURIComponent(
                  contratoId,
                )}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-xl border border-border bg-white px-4 py-2 font-semibold text-brand hover:bg-surface-muted"
              >
                Ver minuta (prévia)
              </a>

              {contratoPdf ? (
                <>
                  <button
                    type="button"
                    onClick={() => void openPdf()}
                    className="inline-flex items-center justify-center rounded-xl bg-brand px-4 py-2 font-semibold text-white hover:bg-brand/90"
                  >
                    Abrir contrato (PDF)
                  </button>

                  <button
                    type="button"
                    onClick={() => void downloadPdf()}
                    className="inline-flex items-center justify-center rounded-xl border border-border bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-surface-muted"
                  >
                    Baixar PDF
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center justify-center rounded-xl bg-border px-4 py-2 font-semibold text-slate-400 cursor-not-allowed"
                >
                  Contrato PDF (aguardando)
                </button>
              )}

              {contrato?.status === "ativo" && (
                <a
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-xl bg-brand px-4 py-2 font-semibold text-white hover:bg-brand/90"
                >
                  Acessar sistema
                </a>
              )}
            </div>

            {/* Detalhes do pagamento */}
            {pagamento && (
              <div className="mt-4 rounded-xl border border-border bg-white p-4 text-sm">
                <p className="font-semibold text-slate-800">
                  Detalhes do pagamento
                </p>
                <div className="mt-2 grid gap-2 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>Pedido</span>
                    <span className="font-semibold text-slate-800">
                      {pagamento.order_id}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Status</span>
                    <span className="font-semibold text-slate-800">
                      {pagamento.status ?? "—"}
                    </span>
                  </div>
                  {contrato?.status === "ativo" && (
                    <div className="mt-4 rounded-xl bg-green-50 p-4 text-sm text-green-800">
                      Seu contrato está ativo ✅
                      <br />
                      Você já pode acessar o sistema e iniciar o uso.
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span>Método</span>
                    <span className="font-semibold text-slate-800">
                      {pagamento.method ?? "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Valor</span>
                    <span className="font-semibold text-slate-800">
                      {fmtBRLFromCents(pagamento.amount)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {err && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {err}
              </div>
            )}

            {loading && (
              <p className="mt-4 text-sm text-slate-500">Carregando…</p>
            )}
          </div>

          {/* Sidebar contrato */}
          <aside className="rounded-2xl border border-border bg-surface p-5">
            <div className="rounded-xl border border-border bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">
                  Primeiros passos
                </p>
                <span className="text-xs font-semibold text-slate-500">
                  {doneCount}/{steps.length}
                </span>
              </div>

              <div className="mt-3 h-2 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-brand transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              <ol className="mt-4 space-y-3">
                {steps.map((s, idx) => (
                  <li key={s.id} className="flex gap-3">
                    <span
                      className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-extrabold ${
                        s.done
                          ? "bg-brand-secondary text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {idx + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-semibold ${s.done ? "text-slate-800" : "text-slate-700"}`}
                      >
                        {s.title}
                      </p>

                      {/* CTA */}
                      {s.href ? (
                        <a
                          href={s.href}
                          target={
                            s.href.startsWith("http") ? "_blank" : undefined
                          }
                          rel={
                            s.href.startsWith("http") ? "noreferrer" : undefined
                          }
                          className={`mt-2 inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-semibold ${
                            s.done
                              ? "bg-brand text-white hover:bg-brand/90"
                              : "bg-slate-200 text-slate-400 cursor-not-allowed"
                          }`}
                          {...(!s.done
                            ? { onClick: (e) => e.preventDefault() }
                            : {})}
                        >
                          {s.cta}
                        </a>
                      ) : s.onClick && s.cta ? (
                        <button
                          type="button"
                          onClick={s.onClick}
                          className="mt-2 inline-flex items-center justify-center rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-surface-muted"
                        >
                          {s.cta}
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <p className="text-sm font-semibold text-slate-800">
              Detalhes do contrato
            </p>
            <div className="mt-6 rounded-xl border border-border bg-white p-4">
              <p className="text-sm font-semibold text-slate-800">
                Linha do tempo
              </p>

              {eventosLoading && (
                <p className="mt-2 text-xs text-slate-500">
                  Carregando eventos…
                </p>
              )}

              {!eventosLoading && eventos.length === 0 && (
                <p className="mt-2 text-xs text-slate-500">
                  Sem eventos ainda. Assim que o pagamento/geração avançar, eles
                  aparecem aqui.
                </p>
              )}

              <ol className="mt-3 space-y-3">
                {eventos.map((ev) => (
                  <li key={ev.id} className="flex gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-brand-secondary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-700">
                        {humanizeEvento(ev.tipo)}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {new Date(ev.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            {contrato ? (
              <div className="mt-3 grid gap-2 text-xs text-slate-500">
                <div className="flex items-center justify-between">
                  <span>Número</span>
                  <span className="font-semibold text-slate-800">
                    {contrato.numero_contrato}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Versão</span>
                  <span className="font-semibold text-slate-800">
                    {contrato.versao}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Status</span>
                  <span className="font-semibold text-slate-800">
                    {contrato.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Forma pagamento</span>
                  <span className="font-semibold text-slate-800">
                    {contrato.forma_pagamento ?? "—"}
                  </span>
                </div>

                <div className="h-px bg-border my-2" />

                <div className="flex items-center justify-between">
                  <span>Aceite termos</span>
                  <span className="font-semibold text-slate-800">
                    {contrato.aceite_termos ? "Sim" : "Não"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Versão termos</span>
                  <span className="font-semibold text-slate-800">
                    {contrato.versao_termos ?? "—"}
                  </span>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-600">
                Contrato não carregado.
              </p>
            )}

            <div className="mt-4 rounded-xl bg-surface-muted p-3 text-xs text-slate-600">
              <p className="font-semibold text-slate-800">
                Onde fica meu contrato?
              </p>
              <p className="mt-1">
                A minuta está disponível imediatamente. O PDF final aparece
                assim que o webhook gerar e salvar o <code>pdf_url</code>.
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
