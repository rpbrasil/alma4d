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

export default function ContratoStatusClient({
  contratoId,
  orderId,
}: {
  contratoId: string;
  orderId?: string;
}) {
  const [data, setData] = useState<StatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const pollMs = useMemo(() => 5000, []);

  /**
   * ✅ load com AbortController para evitar setState após unmount
   * ✅ useCallback para estabilizar referência e facilitar deps do useEffect
   */
  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const qs = new URLSearchParams();
        qs.set("contratoId", contratoId);
        if (orderId) qs.set("orderId", orderId);

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
    [contratoId, orderId],
  );

  /**
   * ✅ FIX do lint react-hooks/set-state-in-effect:
   * Não chamamos load() direto no corpo do effect.
   * Agendamos a chamada inicial com setTimeout (0ms) e o polling via setInterval.
   */
  useEffect(() => {
    let mounted = true;
    const ac = new AbortController();

    // chamada inicial “assíncrona” (evita setState sincronamente no effect body)
    const first = window.setTimeout(() => {
      if (!mounted) return;
      void load(ac.signal);
    }, 0);

    const interval = window.setInterval(() => {
      if (!mounted) return;

      // opcional: evitar polling quando aba está escondida
      if (document.visibilityState === "hidden") return;

      void load(ac.signal);
    }, pollMs);

    return () => {
      mounted = false;
      window.clearTimeout(first);
      window.clearInterval(interval);
      ac.abort();
    };
  }, [load, pollMs]);

  const contrato = data?.contrato ?? null;
  const pagamento = data?.pagamento ?? null;

  const paymentStatus = pagamento?.status ?? (orderId ? "unknown" : null);
  const paid = paymentStatus === "paid";
  const failed = paymentStatus === "failed" || paymentStatus === "canceled";
  const pending =
    !failed &&
    !paid &&
    (paymentStatus === "pending" || paymentStatus === "unknown" || !!orderId);

  const contratoPdf = contrato?.pdf_assinado_url ?? contrato?.pdf_url ?? null;

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
              PDF final do contrato assim que estiver pronto.
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

        {/* Conteúdo */}
        <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
          {/* Card principal */}
          <div className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Status do pagamento
                </p>

                {!orderId && (
                  <p className="mt-1 text-sm text-slate-600">
                    Não recebemos o{" "}
                    <span className="font-semibold">order_id</span> nesta URL.
                    Se você veio do Pix/Boleto, volte e clique em “Acompanhar
                    contrato e pagamento”.
                  </p>
                )}

                {orderId && (
                  <p className="mt-1 text-sm text-slate-600">
                    {paid && "Pagamento confirmado."}
                    {pending && "Aguardando confirmação do pagamento."}
                    {failed &&
                      "Pagamento não confirmado (falhou ou foi cancelado)."}
                  </p>
                )}
              </div>

              {!orderId && <Badge tone="info">Sem order_id</Badge>}
              {orderId && paid && <Badge tone="ok">Pago</Badge>}
              {orderId && pending && <Badge tone="warn">Pendente</Badge>}
              {orderId && failed && <Badge tone="err">Não confirmado</Badge>}
            </div>

            {/* Dicas práticas Pix vs boleto */}
            {orderId && (
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
                  <a
                    href={contratoPdf}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-xl bg-brand px-4 py-2 font-semibold text-white hover:bg-brand/90"
                  >
                    Abrir contrato (PDF)
                  </a>
                  <a
                    href={contratoPdf}
                    download
                    className="inline-flex items-center justify-center rounded-xl border border-border bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-surface-muted"
                  >
                    Baixar PDF
                  </a>
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
            <p className="text-sm font-semibold text-slate-800">
              Detalhes do contrato
            </p>

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
