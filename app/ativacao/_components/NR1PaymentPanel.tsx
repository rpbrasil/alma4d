"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { supabaseBrowser as supabase } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";

type PaymentMethod = "pix" | "boleto";

type LastTransaction = {
  id?: string;
  status?: string;
  qr_code?: string;
  qr_code_url?: string;
  expires_at?: string;
  boleto_url?: string;
  line?: string;
};

type Charge = {
  id?: string;
  payment_method?: string; // "pix" | "boleto"
  last_transaction?: LastTransaction;
  metadata?: Record<string, unknown>;
};

type Order = {
  id?: string;
  status?: "pending" | "paid" | "canceled" | "failed" | string;
  amount?: number;
  charges?: Charge[];
  metadata?: Record<string, unknown>;
};

type CreatePaymentResponse = {
  mode?: string;
  order_id?: string;
  order_status?: string;
  order_code?: string;
  order_seq?: number;
  payment_method?: string;
  total_amount?: number;
  order?: Order;
  error?: string;
  detail?: unknown;
};

function onlyDigits(v: string) {
  return (v || "").replace(/\D/g, "");
}

function formatMoneyBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
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

function getErrorMessage(e: unknown, fallback: string) {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return fallback;
}

export function NR1PaymentPanel(props: {
  userId: string;
  clienteId: string;
  contratoId: string;

  funcionarios: number;

  nomeCompleto: string;
  email: string;
  documento: string;

  origem?: string | null;
  campanha?: string | null;

  // ✅ agora explicitamente em CENTAVOS
  precoTotalCents: number;

  // ✅ opcional: mostrar cupom aplicado (somente leitura)
  cupomCodigo?: string | null;
}) {
  const {
    userId,
    clienteId,
    contratoId,
    nomeCompleto,
    email,
    documento,
    origem,
    campanha,
    funcionarios,
    precoTotalCents,
    cupomCodigo,
  } = props;

  const router = useRouter();
  const [method, setMethod] = useState<PaymentMethod>("pix");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [result, setResult] = useState<CreatePaymentResponse | null>(null);

  const [copied, setCopied] = useState(false);

  // countdown
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  // timers
  const countdownTimerRef = useRef<number | null>(null);

  const order = result?.order;
  const charge = order?.charges?.[0];
  const tx = charge?.last_transaction;

  const orderId = result?.order_id ?? result?.order?.id ?? null;

  const isPaid = order?.status === "paid";
  const isFailed = order?.status === "failed";
  const isCanceled = order?.status === "canceled";

  const pixExpiresAt = tx?.expires_at ?? null;
  const pixExpired = remainingMs !== null && remainingMs <= 0;

  async function criarPagamento(): Promise<void> {
    setErr(null);
    setLoading(true);

    try {
      if (!email?.trim())
        throw new Error("E-mail é obrigatório para o pagamento.");
      if (!nomeCompleto?.trim())
        throw new Error("Nome completo é obrigatório.");
      if (!onlyDigits(documento)) throw new Error("CPF é obrigatório.");
      if (!Number.isInteger(funcionarios) || funcionarios <= 0)
        throw new Error("Funcionários inválido.");

      // ✅ pega token da sessão (obrigatório para /api/nr1/pagamento)
      const { data: sessionData, error: sessionErr } =
        await supabase.auth.getSession();
      if (sessionErr) throw new Error("Falha ao obter sessão para pagamento.");
      const accessToken = sessionData.session?.access_token;
      if (!accessToken)
        throw new Error(
          "Sessão inválida (token ausente). Faça login novamente.",
        );

      const res = await fetch("/api/nr1/pagamento", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          // OBS: o backend ignora user_id vindo do client e usa o callerId do token
          user_id: userId,
          product_id: "nr1_psicossocial",
          cliente_id: clienteId,
          contrato_id: contratoId,
          funcionarios,
          payment_method: method,
          total_amount_cents: precoTotalCents,

          email: email.trim(),
          nome_completo: nomeCompleto.trim(),
          documento: onlyDigits(documento),

          origem: origem || null,
          campanha: campanha || null,
        }),
      });

      const data = (await res
        .json()
        .catch(() => ({}))) as CreatePaymentResponse;

      if (!res.ok) {
        const msg = data?.error ?? "Falha ao criar pagamento.";
        throw new Error(msg);
      }

      setResult(data);
      router.push(`/checkout/status?contratoId=${contratoId}`);
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Erro ao criar pagamento."));
    } finally {
      setLoading(false);
    }
  }

  function copiarPix(valor: string) {
    navigator.clipboard.writeText(valor);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // ========= Countdown (Pix) =========
  useEffect(() => {
    if (countdownTimerRef.current) {
      window.clearInterval(countdownTimerRef.current);
    }

    function initCountdown() {
      if (!pixExpiresAt) {
        setRemainingMs(null);
        return;
      }

      const tick = () => {
        const ms = new Date(pixExpiresAt).getTime() - Date.now();
        setRemainingMs(ms);
      };

      tick();
      countdownTimerRef.current = window.setInterval(tick, 1000);
    }

    initCountdown();

    return () => {
      if (countdownTimerRef.current) {
        window.clearInterval(countdownTimerRef.current);
      }
    };
  }, [pixExpiresAt]);

  return (
    <div className="grid gap-5">
      <div>
        <h2 className="text-lg font-extrabold text-brand">Pagamento</h2>
        <p className="text-sm text-slate-600">
          Escolha Pix ou Boleto e finalize.
        </p>
      </div>
      {/* Resumo */}
      {/* <div className="rounded-xl border border-border bg-surface-muted p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold text-slate-800">NR‑1 • COPSOQ II BR</p>
            <p className="text-sm text-slate-600">
              Valor total: {formatMoneyBRL(precoTotalCents)} ({funcionarios}{" "}
              colaboradores)
            </p>

            {cupomCodigo ? (
              <p className="text-xs text-slate-500 mt-1">
                Cupom aplicado:{" "}
                <span className="font-semibold">{cupomCodigo}</span>
              </p>
            ) : null}
          </div>
          <div className="text-xs text-slate-500 font-semibold text-right">
            Contrato
            <br />
            <span className="text-slate-700">{contratoId.slice(0, 8)}…</span>
          </div>
        </div>
      </div> */}
      {/* Configuração */}
      {/* <div className="grid sm:grid-cols-2 gap-3">
        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-700">
            Funcionários
          </span>
          <input
            type="number"
            min={1}
            value={funcionarios}
            readOnly
            className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-brand/10"
            inputMode="numeric"
          />
        </label>
      </div> */}
      {/* Métodos + CTA */}
      <div className="rounded-xl border border-border bg-white p-4">
        <p className="text-sm font-semibold text-slate-700 mb-3">
          Método de pagamento
        </p>

        <div className="grid sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMethod("pix")}
            className={`rounded-md border px-3 py-2 text-sm font-semibold ${
              method === "pix"
                ? "border-brand bg-brand/5 text-brand"
                : "border-border bg-white text-slate-700"
            }`}
          >
            Pix
          </button>

          <button
            type="button"
            onClick={() => setMethod("boleto")}
            className={`rounded-md border px-3 py-2 text-sm font-semibold ${
              method === "boleto"
                ? "border-brand bg-brand/5 text-brand"
                : "border-border bg-white text-slate-700"
            }`}
          >
            Boleto
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={criarPagamento}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-md bg-brand px-4 py-2 text-white font-semibold hover:bg-brand/90 disabled:opacity-50"
          >
            {loading
              ? "Gerando..."
              : method === "boleto"
                ? "Gerar Boleto"
                : "Gerar Pix"}
          </button>
          {orderId && (
            <a
              href={`/checkout/status?contratoId=${contratoId}`}
              className="inline-flex flex-col items-start justify-center rounded-xl border border-border bg-white p-4 font-semibold text-brand hover:bg-surface-muted shadow-sm transition-all"
            >
              <span className="mb-1 text-[10px] uppercase tracking-wider text-slate-500">
                Status do Pedido
              </span>
              <span className="text-sm">Acompanhar contrato e pagamento</span>
              <p className="mt-2 text-xs font-normal text-slate-400">
                Clique aqui para acessar o PDF e o status do Pagar.me
              </p>
            </a>
          )}
          {/* Gerar novo QR (Pix) */}
          {method === "pix" && orderId && (
            <button
              type="button"
              onClick={criarPagamento}
              className="inline-flex items-center justify-center rounded-md border border-border bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-surface-muted"
            >
              Gerar novo QR
            </button>
          )}
        </div>

        {err && (
          <div className="mt-3 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {err}
          </div>
        )}
      </div>
      {/* Resultado */}
      {order && charge && tx && (
        <div className="rounded-xl border border-border bg-white p-4 grid gap-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-slate-800">
                Status:{" "}
                <span className="text-brand-secondary">{order.status}</span>
              </p>
              <p className="text-xs text-slate-500">
                Pedido: {order.id ?? "—"} • Cobrança: {charge.id ?? "—"}
              </p>
            </div>
            <div className="text-xs text-slate-500 text-right">
              Total
              <br />
              <span className="font-semibold text-slate-800">
                {formatMoneyBRL(order.amount ?? 0)}
              </span>
            </div>
          </div>

          {/* PIX */}
          {charge.payment_method === "pix" && (
            <div className="grid gap-3">
              <p className="text-sm font-semibold text-slate-700">
                Pague com Pix
              </p>

              {/* QR Code */}
              {tx.qr_code_url ? (
                <div className="flex justify-center">
                  <Image
                    src={tx.qr_code_url}
                    alt="QR Code Pix"
                    width={240}
                    height={240}
                    unoptimized
                  />
                </div>
              ) : null}

              {/* Countdown */}
              {remainingMs !== null && (
                <div
                  className={`rounded-md p-3 text-sm font-semibold ${
                    pixExpired
                      ? "bg-red-50 border border-red-200 text-red-700"
                      : "bg-amber-50 border border-amber-200 text-amber-800"
                  }`}
                >
                  {pixExpired
                    ? "QR expirou. Gere um novo QR para pagar."
                    : `Expira em: ${msToMMSS(remainingMs)}`}
                </div>
              )}

              {/* Copia e cola */}
              <div>
                <p className="text-xs text-slate-500 mb-1">Copia e cola</p>
                <textarea
                  readOnly
                  value={tx.qr_code ?? ""}
                  className="w-full h-24 rounded-md border border-border p-2 text-xs"
                />
                <button
                  type="button"
                  onClick={() =>
                    tx.qr_code ? copiarPix(tx.qr_code) : undefined
                  }
                  disabled={!tx.qr_code || pixExpired}
                  className="mt-2 inline-flex items-center justify-center rounded-md border border-border bg-surface px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-surface-muted disabled:opacity-50"
                >
                  {copied ? "Copiado ✅" : "Copiar código Pix"}
                </button>
              </div>

              {isPaid && (
                <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800 font-semibold">
                  Pagamento confirmado ✅ Sua NR‑1 está sendo ativada
                  automaticamente.
                </div>
              )}
              {isFailed && (
                <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700 font-semibold">
                  Pagamento falhou ❌ Gere um novo QR e tente novamente.
                </div>
              )}
              {isCanceled && (
                <div className="rounded-md bg-slate-100 border border-slate-200 p-3 text-sm text-slate-700 font-semibold">
                  Pagamento cancelado.
                </div>
              )}
            </div>
          )}

          {/* BOLETO */}
          {charge.payment_method === "boleto" && (
            <div className="grid gap-2">
              <p className="text-sm font-semibold text-slate-700">
                Boleto gerado
              </p>

              {tx.boleto_url ? (
                <a
                  href={tx.boleto_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex justify-center rounded-md bg-brand px-4 py-2 text-white font-semibold hover:bg-brand/90"
                >
                  Abrir boleto
                </a>
              ) : null}

              {tx.line ? (
                <div className="rounded-md border border-border p-3">
                  <p className="text-xs text-slate-500">Linha digitável</p>
                  <p className="text-sm font-semibold break-all">{tx.line}</p>
                </div>
              ) : null}

              {isPaid && (
                <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800 font-semibold">
                  Pagamento confirmado ✅ Sua NR‑1 está sendo ativada
                  automaticamente.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
