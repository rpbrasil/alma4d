"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useContratoStatus } from "@/hooks/useContratoStatus";
import { useRouter } from "next/navigation";
import { supabaseBrowser as supabase } from "@/lib/supabase/browser";

type Pagamento = {
  order_id?: string | null;
  status?: string | null;
  amount?: number | null;
  method?: string | null;
};

type Contrato = {
  status?: string | null;
  numero_contrato?: string | null;
  forma_pagamento?: string | null;
};

type Artifacts = {
  pix?: {
    qr_code_url?: string | null;
    qr_code?: string | null;
    expires_at?: string | null;
  } | null;
  boleto?: {
    boleto_url?: string | null;
    line?: string | null;
    expires_at?: string | null;
  } | null;
} | null;

function formatMoneyBRLFromCents(cents: number | null | undefined) {
  const v = typeof cents === "number" ? cents : 0;
  return (v / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function msToMMSS(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function StatusClient({
  contratoId,
}: {
  contratoId: string | null;
}) {
  const { data, loading, checking, autoChecking, verificarPix } =
    useContratoStatus(contratoId);
  const router = useRouter();
  const [sessionReady, setSessionReady] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const contrato = data?.contrato as Contrato | null;
  const pagamento = data?.pagamento as Pagamento | null;
  const artifacts = data?.payment_artifacts as Artifacts;

  const contratoStatus = contrato?.status ?? null;
  const pagamentoStatus = pagamento?.status ?? null;
  const metodo = (pagamento?.method ?? contrato?.forma_pagamento ?? "")
    .toString()
    .toLowerCase();

  const pix = artifacts?.pix ?? null;
  const boleto = artifacts?.boleto ?? null;

  // Countdown PIX (sem Date.now no render)
  const expiresAt = pix?.expires_at ? new Date(pix.expires_at).getTime() : null;
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data: first } = await supabase.auth.getUser();

        if (first.user) {
          if (!cancelled) setSessionReady(true);
          return;
        }

        // retry leve (problema de timing)
        const { data: retry } = await supabase.auth.getUser();

        if (!retry.user) {
          router.replace(
            `/login?redirect=${encodeURIComponent(window.location.href)}`,
          );
          return;
        }

        if (!cancelled) setSessionReady(true);
      } catch (err) {
        console.warn("⚠️ erro ao validar sessão", err);

        if (!cancelled) {
          router.replace(
            `/login?redirect=${encodeURIComponent(window.location.href)}`,
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);
  useEffect(() => {
    if (!expiresAt) return;

    const tick = () => setRemainingMs(expiresAt - Date.now());

    tick();
    const id = setInterval(tick, 1000);

    return () => clearInterval(id);
  }, [expiresAt]);

  useEffect(() => {
    if (contratoStatus === "ativo") {
      // Força refresh da sessão para garantir que o whoami funcione no dashboard
      void (async () => {
        try {
          await supabase.auth.refreshSession();
        } catch {
          // ignora — sessão pode já estar válida
        }
        router.replace("/dashboard/express");
      })();
    }
  }, [contratoStatus, router]);

  if (!sessionReady) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        Carregando sessão...
      </div>
    );
  }

  const pixExpired = remainingMs !== null && remainingMs <= 0;

  const tituloEstado =
    contratoStatus === "ativo"
      ? "Pagamento confirmado"
      : pagamentoStatus === "failed"
        ? "Pagamento não confirmado"
        : "Aguardando pagamento";

  if (loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center bg-surface">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-border border-t-brand" />
          <p className="text-sm text-slate-600">
            Carregando status do pagamento…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] bg-surface">
      {/* HEADER */}
      <header className="border-b border-border bg-white">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/images/alma4d_express_nobground.png"
              alt="alma4D"
              width={92}
              height={92}
              priority
            />
            <div>
              <p className="text-sm font-extrabold text-brand">
                Checkout seguro
              </p>
              <p className="text-xs text-slate-500">
                Contrato{" "}
                <span className="font-semibold text-slate-700">
                  {contrato?.numero_contrato ?? "—"}
                </span>
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs font-semibold text-slate-500">
              Ambiente seguro
            </p>
            <p className="text-[11px] text-slate-400">
              Dados protegidos • Processamento confiável
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 grid gap-4">
        {/* RESUMO */}
        <section className="bg-white rounded-xl border p-5">
          <div className="flex justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase">Status</p>
              <p className="text-lg font-bold">{tituloEstado}</p>
              <p className="text-sm text-slate-600 mt-1">
                Método: <b>{metodo.toUpperCase()}</b>
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs text-slate-500 uppercase">Valor</p>
              <p className="text-lg font-bold">
                {formatMoneyBRLFromCents(pagamento?.amount)}
              </p>
            </div>
          </div>
        </section>

        {/* ✅ ATIVO */}
        {contratoStatus === "ativo" && (
          <section className="bg-white rounded-xl border p-6 text-center">
            <h1 className="text-2xl font-bold text-green-600">
              ✅ Pagamento confirmado
            </h1>

            <p className="mt-2 text-slate-600">Seu acesso já foi liberado.</p>

            <button
              onClick={() => router.push("/dashboard/express")}
              className="mt-6 bg-brand text-white px-6 py-3 rounded"
            >
              Acessar sistema
            </button>

            <p className="mt-4 text-sm text-slate-500">
              Você também recebeu instruções por email.
            </p>
          </section>
        )}

        {/* ❌ FALHA */}
        {pagamentoStatus === "failed" && (
          <section className="bg-white rounded-xl border p-6 text-center">
            <h1 className="text-2xl font-bold text-red-600">
              ❌ Pagamento não confirmado
            </h1>

            <p className="mt-2 text-slate-600">
              O pagamento não foi identificado. Tente novamente.
            </p>

            <a
              href={`/contrato/${contratoId}`}
              className="mt-6 inline-block bg-brand text-white px-6 py-3 rounded"
            >
              Gerar novo pagamento
            </a>
          </section>
        )}

        {/* ⏳ PENDING */}
        {contratoStatus === "rascunho" && (
          <section className="bg-white rounded-xl border p-6">
            {/* Steps de progresso — r\u00f3tulos din\u00e2micos por m\u00e9todo */}
            <ol className="flex items-center gap-0 mb-6">
              {[
                {
                  label: metodo === "boleto" ? "Boleto gerado" : "PIX gerado",
                  done: true,
                },
                {
                  label:
                    metodo === "boleto"
                      ? "Aguardando compensa\u00e7\u00e3o"
                      : "Aguardando pagamento",
                  done: false,
                  active: true,
                },
                { label: "Acesso liberado", done: false },
              ].map((step, i) => (
                <li key={i} className="flex-1 flex items-center">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                        step.done
                          ? "bg-green-500 border-green-500 text-white"
                          : step.active
                            ? "bg-brand border-brand text-white"
                            : "bg-white border-slate-300 text-slate-400"
                      }`}
                    >
                      {step.done ? "\u2713" : i + 1}
                    </div>
                    <span
                      className={`mt-1 text-[10px] text-center leading-tight ${
                        step.active
                          ? "font-semibold text-brand"
                          : step.done
                            ? "text-green-600"
                            : "text-slate-400"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {i < 2 && (
                    <div
                      className={`h-0.5 flex-1 -mt-4 ${step.done ? "bg-green-400" : "bg-slate-200"}`}
                    />
                  )}
                </li>
              ))}
            </ol>

            <h2 className="text-xl font-bold">
              Aguardando confirma\u00e7\u00e3o
            </h2>

            {/* PIX */}
            {metodo === "pix" && (
              <div className="mt-4 text-center space-y-4">
                {pix?.qr_code_url && (
                  <Image
                    src={pix.qr_code_url}
                    alt="QR Code Pix"
                    width={200}
                    height={200}
                    className="mx-auto rounded-lg border border-slate-100"
                    unoptimized
                  />
                )}

                {remainingMs !== null && !pixExpired && (
                  <p className="text-sm text-slate-500">
                    QR expira em{" "}
                    <span className="font-semibold text-slate-700">
                      {msToMMSS(remainingMs)}
                    </span>
                  </p>
                )}

                {pixExpired && (
                  <p className="text-sm font-semibold text-red-600">
                    QR expirado.{" "}
                    <a
                      href={`/contrato/${contratoId}`}
                      className="underline hover:text-red-700"
                    >
                      Gere um novo pagamento
                    </a>
                    .
                  </p>
                )}

                {pix?.qr_code && !pixExpired && (
                  <div className="mx-auto max-w-sm text-left">
                    <p className="text-xs text-slate-500 mb-1">
                      Pix copia e cola
                    </p>
                    <textarea
                      readOnly
                      value={pix.qr_code}
                      className="w-full text-xs p-2 border rounded-lg h-20 resize-none bg-slate-50"
                    />
                  </div>
                )}

                {/* Status de verifica\u00e7\u00e3o autom\u00e1tica */}
                <div
                  className={`mx-auto max-w-xs rounded-xl border px-4 py-3 text-sm ${
                    autoChecking || checking
                      ? "border-brand/30 bg-brand/5"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    {autoChecking || checking ? (
                      <>
                        <span className="h-3.5 w-3.5 rounded-full border-2 border-brand border-t-transparent animate-spin" />
                        <span className="font-medium text-brand">
                          Verificando pagamento...
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-slate-400">\u25cf</span>
                        <span className="text-slate-600">
                          Monitorando automaticamente
                        </span>
                      </>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400 text-center">
                    A confirma\u00e7\u00e3o ocorre em segundos ap\u00f3s o
                    pagamento
                  </p>
                </div>

                {/* Bot\u00e3o manual como fallback */}
                <button
                  onClick={verificarPix}
                  disabled={checking || autoChecking || pixExpired}
                  className="text-sm text-slate-500 underline hover:text-slate-700 disabled:no-underline disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  {checking ? "Verificando..." : "Verificar agora"}
                </button>
              </div>
            )}

            {/* BOLETO */}
            {metodo === "boleto" && (
              <div className="mt-4 space-y-4">
                {/* Destaque de prazo */}
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex gap-3 items-start">
                  <span className="text-lg">⏳</span>
                  <div>
                    <p className="font-semibold text-amber-900 text-sm">
                      Boleto enviado para o seu e-mail
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      A compensa\u00e7\u00e3o banc\u00e1ria leva at\u00e9{" "}
                      <strong>1 dia \u00fatil</strong> ap\u00f3s o pagamento.
                      Seu acesso ser\u00e1 liberado automaticamente.
                    </p>
                    {boleto?.expires_at && (
                      <p className="text-xs text-amber-700 mt-1">
                        Vencimento:{" "}
                        <strong>
                          {new Date(boleto.expires_at).toLocaleDateString(
                            "pt-BR",
                          )}
                        </strong>
                      </p>
                    )}
                  </div>
                </div>

                {/* Bot\u00e3o abrir boleto */}
                {boleto?.boleto_url && (
                  <div className="text-center">
                    <a
                      href={boleto.boleto_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-brand text-white px-6 py-3 rounded-lg font-semibold hover:brightness-95 transition"
                    >
                      Abrir boleto
                    </a>
                    <p className="mt-2 text-xs text-slate-400">
                      Abre em nova aba \u2022 tamb\u00e9m enviado por e-mail
                    </p>
                  </div>
                )}

                {/* Linha digit\u00e1vel com bot\u00e3o de copiar */}
                {boleto?.line && (
                  <div>
                    <p className="text-xs font-medium text-slate-600 mb-1">
                      C\u00f3digo de barras (linha digit\u00e1vel)
                    </p>
                    <div className="flex gap-2 items-start">
                      <textarea
                        readOnly
                        value={boleto.line}
                        className="flex-1 text-xs p-2 border rounded-lg h-14 resize-none bg-slate-50 font-mono"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard
                            .writeText(boleto.line ?? "")
                            .then(() => {
                              setCopiado(true);
                              setTimeout(() => setCopiado(false), 2000);
                            })
                            .catch(() => {});
                        }}
                        className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                      >
                        {copiado ? "\u2705 Copiado" : "Copiar"}
                      </button>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Use este c\u00f3digo para pagar via internet banking sem
                      abrir o PDF
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        <footer className="text-center text-xs text-slate-400">
          Pagamentos processados com segurança • cliente@voss.digital
        </footer>
      </main>
    </div>
  );
}
