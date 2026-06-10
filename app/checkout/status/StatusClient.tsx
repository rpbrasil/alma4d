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
  const { data, loading, checking, verificarPix } =
    useContratoStatus(contratoId);
  const router = useRouter();
  const [sessionReady, setSessionReady] = useState(false);
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
      router.replace("/dashboard/express");
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
            <h2 className="text-xl font-bold">Confirmação de pagamento</h2>

            {/* PIX */}
            {metodo === "pix" && (
              <div className="mt-6 text-center">
                {pix?.qr_code_url && (
                  <Image
                    src={pix.qr_code_url}
                    alt="QR Code Pix"
                    width={220}
                    height={220}
                    className="mx-auto"
                    unoptimized
                  />
                )}

                {remainingMs !== null && !pixExpired && (
                  <p className="mt-2 text-sm text-slate-600">
                    Expira em {msToMMSS(remainingMs)}
                  </p>
                )}

                {pixExpired && (
                  <p className="mt-2 text-sm text-red-600">
                    QR expirado. Gere um novo pagamento.
                  </p>
                )}

                {pix?.qr_code && (
                  <div className="mt-4">
                    <textarea
                      readOnly
                      value={pix.qr_code}
                      className="w-full text-xs p-2 border rounded"
                    />
                  </div>
                )}

                <p className="mt-4 text-sm text-slate-600">
                  Após realizar o pagamento, clique em <b>Já paguei</b> para
                  verificar.
                </p>

                <button
                  onClick={verificarPix}
                  disabled={checking}
                  className="mt-4 bg-brand text-white px-6 py-3 rounded"
                >
                  {checking ? "Verificando..." : "Já paguei"}
                </button>
              </div>
            )}

            {/* BOLETO */}
            {metodo === "boleto" && (
              <div className="mt-6 text-center">
                {boleto?.boleto_url && (
                  <a
                    href={boleto.boleto_url}
                    target="_blank"
                    className="bg-brand text-white px-6 py-3 rounded inline-block"
                  >
                    Abrir boleto
                  </a>
                )}

                {boleto?.line && (
                  <div className="mt-4">
                    <textarea
                      readOnly
                      value={boleto.line}
                      className="w-full text-xs p-2 border rounded"
                    />
                  </div>
                )}

                <p className="mt-4 text-sm text-slate-600">
                  Pagamentos via boleto podem levar até <b>1 dia útil</b> para
                  compensação.
                </p>

                <p className="text-sm text-slate-600 mt-2">
                  Assim que o pagamento for confirmado, você receberá as
                  instruções de acesso por email.
                </p>
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
