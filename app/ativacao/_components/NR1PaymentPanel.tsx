"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { supabaseBrowser as supabase } from "@/lib/supabase/browser";

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
  precoTotalCents: number;
  cupomCodigo?: string | null;
  operationType?: "ativacao" | "upgrade";
  quantidadeAdicional?: number | null;
  precoUnitario?: number | null;
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
    operationType = "ativacao",
    quantidadeAdicional = null,
    precoUnitario = null,
  } = props;

  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<CreatePaymentResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  const countdownTimerRef = useRef<number | null>(null);

  const order = result?.order;
  const charge = order?.charges?.[0];
  const tx = charge?.last_transaction ?? null;

  const orderId = result?.order_id ?? result?.order?.id ?? null;

  const isPaid = order?.status === "paid";
  const isFailed = order?.status === "failed";
  const isCanceled = order?.status === "canceled";

  const pixExpiresAt = tx?.expires_at ?? null;
  const pixExpired = remainingMs !== null && remainingMs <= 0;

  const limparResultado = () => {
    setResult(null);
    setErr(null);
    setCopied(false);
    setRemainingMs(null);
  };

  async function criarPagamento(): Promise<void> {
    setErr(null);
    setLoading(true);

    try {
      // try to resolve email from props first, then from authenticated session
      const { data: sessionData, error: sessionErr } =
        await supabase.auth.getSession();

      if (sessionErr) {
        // non-fatal for email resolution, but keep for token later
        // we'll still try to proceed if email is available from props
        // setErr will be handled below if token is missing
      }

      const sessionEmail = sessionData?.session?.user?.email ?? "";
      const emailValue = email && email.trim() ? email.trim() : sessionEmail;

      // resolve documento (CPF) from props or from user profile if missing
      const documentoDigitsProp = onlyDigits(documento || "");
      let documentoValue =
        documentoDigitsProp && documentoDigitsProp.length === 11
          ? documentoDigitsProp
          : "";

      if (!documentoValue) {
        try {
          // whoami returns usuario_id for application user mapping
          const whoRes = await fetch("/api/auth/whoami");
          if (whoRes.ok) {
            const perfil = await whoRes.json().catch(() => null);
            const usuarioId = perfil?.usuario_id ?? null;
            if (usuarioId) {
              const { data: usuario, error: usuarioErr } = await supabase
                .from("usuarios")
                .select("documento")
                .eq("id", usuarioId)
                .maybeSingle();
              if (!usuarioErr && usuario?.documento) {
                documentoValue = onlyDigits(String(usuario.documento));
              }
            }
          }
        } catch {
          // ignore; we'll validate below and show error if missing
        }
      }

      if (!emailValue) {
        throw new Error("E-mail é obrigatório para o pagamento.");
      }

      if (!nomeCompleto.trim()) {
        throw new Error("Nome completo é obrigatório.");
      }

      if (!documentoValue) {
        throw new Error("CPF é obrigatório.");
      }

      if (!Number.isInteger(funcionarios) || funcionarios <= 0) {
        throw new Error("Funcionários inválidos.");
      }

      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error(
          "Sessão inválida (token ausente). Faça login novamente.",
        );
      }

      const res = await fetch("/api/nr1/pagamento", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          user_id: userId,
          product_id: "nr1_psicossocial",
          cliente_id: clienteId,
          contrato_id: contratoId,
          funcionarios,
          payment_method: method,
          total_amount_cents: precoTotalCents,
          email: email && email.trim() ? email.trim() : sessionEmail,
          nome_completo: nomeCompleto.trim(),
          documento: documentoValue,
          origem: origem || null,
          campanha: campanha || null,
          operation_type: operationType,
          quantidade_adicional: quantidadeAdicional,
          preco_unitario: precoUnitario,
        }),
      });

      const data = (await res
        .json()
        .catch(() => ({}))) as CreatePaymentResponse;

      if (!res.ok) {
        throw new Error(data?.error ?? "Falha ao criar pagamento.");
      }

      setCopied(false);
      setResult(data);
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Erro ao criar pagamento."));
    } finally {
      setLoading(false);
    }
  }

  function copiarPix(valor: string) {
    navigator.clipboard.writeText(valor);
    setCopied(true);

    window.setTimeout(() => {
      setCopied(false);
    }, 1500);
  }

  useEffect(() => {
    if (countdownTimerRef.current) {
      window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    if (!pixExpiresAt) {
      return;
    }

    const tick = () => {
      const ms = new Date(pixExpiresAt).getTime() - Date.now();
      setRemainingMs(ms);
    };

    tick();
    countdownTimerRef.current = window.setInterval(tick, 1000);

    return () => {
      if (countdownTimerRef.current) {
        window.clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
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

      <div className="rounded-xl border border-border bg-white p-4">
        <p className="mb-3 text-sm font-semibold text-slate-700">
          Método de pagamento
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setMethod("pix");
              limparResultado();
            }}
            className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
              method === "pix"
                ? "border-brand bg-brand/5 text-brand"
                : "border-border bg-white text-slate-700 hover:bg-surface-muted"
            }`}
          >
            Pix
          </button>
          <button
            type="button"
            onClick={() => {
              setMethod("boleto");
              limparResultado();
            }}
            className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
              method === "boleto"
                ? "border-brand bg-brand/5 text-brand"
                : "border-border bg-white text-slate-700 hover:bg-surface-muted"
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
            className="inline-flex items-center justify-center rounded-md bg-brand px-4 py-2 font-semibold text-white transition hover:bg-brand/90 disabled:opacity-50"
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
              className="inline-flex flex-col items-start justify-center rounded-xl border border-border bg-white p-4 font-semibold text-brand shadow-sm transition-all hover:bg-surface-muted"
            >
              <span className="mb-1 text-[10px] uppercase tracking-wider text-slate-500">
                Status do Pedido
              </span>
              <span className="text-sm">Acompanhar pagamento</span>
              <p className="mt-2 text-xs font-normal text-slate-400">
                Use esta página se quiser acompanhar depois
              </p>
            </a>
          )}

          {method === "pix" && orderId && (
            <button
              type="button"
              onClick={() => {
                limparResultado();
                void criarPagamento();
              }}
              className="inline-flex items-center justify-center rounded-md border border-border bg-white px-4 py-2 font-semibold text-slate-700 transition hover:bg-surface-muted"
            >
              Gerar novo QR
            </button>
          )}
        </div>

        {err && (
          <div className="mt-3 rounded-md border border-brand-accent/30 bg-brand-accent/10 p-3 text-sm text-brand-accent">
            {err}
          </div>
        )}
      </div>

      {order && charge && (
        <div className="grid gap-3 rounded-xl border border-border bg-white p-4">
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

            <div className="text-right text-xs text-slate-500">
              Total
              <br />
              <span className="font-semibold text-slate-800">
                {formatMoneyBRL(order.amount ?? 0)}
              </span>
            </div>
          </div>

          {charge.payment_method === "pix" && (
            <div className="grid gap-3">
              <p className="text-sm font-semibold text-slate-700">
                Pague com Pix
              </p>

              {!tx && (
                <div className="rounded-md border border-border bg-surface-muted p-4 text-center">
                  <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-border border-t-brand" />
                  <p className="text-sm font-semibold text-slate-700">
                    Gerando QR Code Pix...
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Isso leva só alguns segundos. Aguarde.
                  </p>
                </div>
              )}

              {tx && (
                <>
                  {!tx.qr_code_url && !tx.qr_code && (
                    <div className="rounded-md border border-border bg-surface-muted p-4 text-center">
                      <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-border border-t-brand" />
                      <p className="text-sm font-semibold text-slate-700">
                        Finalizando geração do QR Code...
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Aguarde mais alguns instantes.
                      </p>
                    </div>
                  )}

                  {tx.qr_code_url && (
                    <div className="flex justify-center">
                      <Image
                        src={tx.qr_code_url}
                        alt="QR Code Pix"
                        width={240}
                        height={240}
                        unoptimized
                      />
                    </div>
                  )}

                  {tx.qr_code_url && remainingMs !== null && (
                    <div
                      className={`rounded-md p-3 text-sm font-semibold ${
                        pixExpired
                          ? "border border-red-200 bg-red-50 text-red-700"
                          : "border border-amber-200 bg-amber-50 text-amber-800"
                      }`}
                    >
                      {pixExpired
                        ? "QR expirou. Gere um novo QR."
                        : `Expira em: ${msToMMSS(remainingMs)}`}
                    </div>
                  )}

                  {tx.qr_code && (
                    <div>
                      <p className="mb-1 text-xs text-slate-500">
                        Copia e cola
                      </p>

                      <textarea
                        readOnly
                        value={tx.qr_code}
                        className="h-24 w-full rounded-md border border-border p-2 text-xs"
                      />

                      <button
                        type="button"
                        onClick={() => copiarPix(tx.qr_code ?? "")}
                        disabled={!tx.qr_code || pixExpired}
                        className="mt-2 inline-flex items-center justify-center rounded-md border border-border bg-surface px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-surface-muted disabled:opacity-50"
                      >
                        {copied ? "Copiado ✅" : "Copiar código Pix"}
                      </button>
                    </div>
                  )}
                </>
              )}

              {isPaid && (
                <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-800">
                  Pagamento confirmado ✅ Sua NR‑1 está sendo ativada
                  automaticamente.
                </div>
              )}

              {isFailed && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                  Pagamento falhou ❌ Gere um novo QR.
                </div>
              )}

              {isCanceled && (
                <div className="rounded-md border border-slate-200 bg-slate-100 p-3 text-sm font-semibold text-slate-700">
                  Pagamento cancelado.
                </div>
              )}
            </div>
          )}

          {charge.payment_method === "boleto" && (
            <div className="grid gap-2">
              <p className="text-sm font-semibold text-slate-700">
                Boleto gerado
              </p>

              {!tx && (
                <div className="rounded-md border border-border bg-surface-muted p-4 text-center">
                  <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-border border-t-brand" />
                  <p className="text-sm font-semibold text-slate-700">
                    Gerando boleto...
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Isso leva só alguns segundos. Aguarde.
                  </p>
                </div>
              )}

              {tx && (
                <>
                  {tx.boleto_url ? (
                    <a
                      href={tx.boleto_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex justify-center rounded-md bg-brand px-4 py-2 font-semibold text-white hover:bg-brand/90"
                    >
                      Abrir boleto
                    </a>
                  ) : null}

                  {tx.line ? (
                    <div className="rounded-md border border-border p-3">
                      <p className="text-xs text-slate-500">Linha digitável</p>
                      <p className="break-all text-sm font-semibold">
                        {tx.line}
                      </p>
                    </div>
                  ) : null}

                  {!tx.boleto_url && !tx.line && (
                    <div className="rounded-md border border-border bg-surface-muted p-4 text-center">
                      <p className="text-sm font-semibold text-slate-700">
                        Finalizando geração do boleto...
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Aguarde mais alguns instantes.
                      </p>
                    </div>
                  )}
                </>
              )}

              {isPaid && (
                <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-800">
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
