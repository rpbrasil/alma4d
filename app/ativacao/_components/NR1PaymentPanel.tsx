"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

type PaymentMethod = "pix" | "boleto" | "credit_card";

type PixTransaction = {
  id?: string;
  qr_code?: string;
  qr_code_url?: string;
  expires_at?: string;
  status?: string;
};

type BoletoTransaction = {
  id?: string;
  boleto_url?: string;
  line?: string;
  status?: string;
};

type LastTransaction = PixTransaction & BoletoTransaction;

type Charge = {
  id?: string;
  payment_method: string;
  last_transaction?: LastTransaction;
};

type Order = {
  id?: string;
  amount?: number;
  status?: string;
  charges?: Charge[];
};

type CreatePaymentResponse = {
  mode?: "order";
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

function toISODateOrNull(v: string | null): string | null {
  if (!v) return null;
  return v;
}

function errorMessage(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

export function NR1PaymentPanel(props: {
  userId: string;
  clienteId: string;
  contratoId: string;
  funcionariosInitial: number;

  nomeCompleto: string;
  email: string;
  documento: string;
  sexo: string;
  dataNascimentoISO: string | null;

  telefoneE164?: string | null;

  origem?: string | null;
  campanha?: string | null;
}) {
  const {
    userId,
    clienteId,
    contratoId,
    funcionariosInitial,
    nomeCompleto,
    email,
    documento,
    sexo,
    dataNascimentoISO,
    telefoneE164,
    origem,
    campanha,
  } = props;

  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [funcionarios, setFuncionarios] = useState<number>(
    funcionariosInitial || 1,
  );
  const [cupom, setCupom] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [result, setResult] = useState<CreatePaymentResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const totalEstimado = useMemo(() => {
    const unit = 1600; // estimativa UI (backend é fonte da verdade)
    return unit * (Number(funcionarios) || 0);
  }, [funcionarios]);

  async function criarPagamento() {
    setErr(null);
    setLoading(true);
    setResult(null);

    try {
      if (!email?.trim())
        throw new Error("E-mail é obrigatório para o pagamento.");
      if (!nomeCompleto?.trim())
        throw new Error("Nome completo é obrigatório para o pagamento.");
      if (!onlyDigits(documento))
        throw new Error("CPF é obrigatório para o pagamento.");
      if (!Number.isInteger(funcionarios) || funcionarios <= 0)
        throw new Error("Funcionários inválido.");

      if (method === "credit_card") {
        throw new Error(
          "Cartão (NR‑1) será habilitado depois. Use Pix ou Boleto.",
        );
      }

      const res = await fetch("/api/nr1/pagamento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          cliente_id: clienteId,
          contrato_id: contratoId,
          funcionarios,
          payment_method: method,
          cupom_codigo: cupom.trim() || null,

          email: email.trim(),
          nome_completo: nomeCompleto.trim(),
          documento: onlyDigits(documento),
          sexo: sexo || null,
          data_nascimento: toISODateOrNull(dataNascimentoISO),
          telefone: telefoneE164 || null,

          origem: origem || null,
          campanha: campanha || null,
        }),
      });

      const data = (await res
        .json()
        .catch(() => ({}))) as CreatePaymentResponse;

      if (!res.ok) {
        throw new Error(data?.error || "Falha ao criar pagamento.");
      }

      setResult(data);
    } catch (e: unknown) {
      setErr(errorMessage(e, "Erro ao criar pagamento."));
    } finally {
      setLoading(false);
    }
  }

  function copiarPix(valor: string) {
    navigator.clipboard.writeText(valor);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const order = result?.order;
  const charge = order?.charges?.[0];
  const tx = charge?.last_transaction;

  const orderAmount = order?.amount ?? 0;
  const chargeId = charge?.id ?? "";
  const txId = tx?.id ?? "";

  const qrCodeUrl = tx?.qr_code_url;
  const qrCode = tx?.qr_code;

  const expiresAt = tx?.expires_at;

  return (
    <div className="grid gap-5">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-brand">
          Pagamento NR‑1
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Escolha Pix ou Boleto. O pagamento fica vinculado ao seu contrato.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface-muted p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold text-slate-800">NR‑1 • COPSOQ II BR</p>
            <p className="text-sm text-slate-600">
              Estimativa: {formatMoneyBRL(totalEstimado)} ({funcionarios}{" "}
              funcionários)
            </p>
          </div>
          <div className="text-xs text-slate-500 font-semibold text-right">
            Contrato
            <br />
            <span className="text-slate-700">{contratoId.slice(0, 8)}…</span>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-700">
            Funcionários
          </span>
          <input
            type="number"
            min={1}
            value={funcionarios}
            onChange={(e) => setFuncionarios(Number(e.target.value))}
            className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-brand/10"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-700">
            Cupom (opcional)
          </span>
          <input
            value={cupom}
            onChange={(e) => setCupom(e.target.value)}
            placeholder="EX: PARCEIRO10"
            className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-brand/10"
          />
        </label>
      </div>

      <div className="rounded-xl border border-border bg-white p-4">
        <p className="text-sm font-semibold text-slate-700 mb-3">
          Método de pagamento
        </p>

        <div className="grid sm:grid-cols-3 gap-2">
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

          <button
            type="button"
            onClick={() => setMethod("credit_card")}
            className="rounded-md border px-3 py-2 text-sm font-semibold border-border bg-white text-slate-400"
            title="Em breve"
          >
            Cartão (em breve)
          </button>
        </div>

        <div className="mt-4">
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
        </div>

        {err && (
          <div className="mt-3 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {err}
          </div>
        )}
      </div>

      {order && charge && tx && (
        <div className="rounded-xl border border-border bg-white p-4 grid gap-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-slate-800">
                Status:{" "}
                <span className="text-brand-secondary">
                  {order.status ?? "—"}
                </span>
              </p>
              <p className="text-xs text-slate-500">
                Charge: {chargeId || "—"} • Transação: {txId || "—"}
              </p>
            </div>
            <div className="text-xs text-slate-500 text-right">
              Total
              <br />
              <span className="font-semibold text-slate-800">
                {formatMoneyBRL(orderAmount)}
              </span>
            </div>
          </div>

          {/* PIX */}
          {charge.payment_method === "pix" && (
            <div className="grid gap-3">
              <p className="text-sm font-semibold text-slate-700">
                Pague com Pix
              </p>

              {qrCodeUrl ? (
                <div className="flex justify-center">
                  <Image
                    src={qrCodeUrl}
                    alt="QR Code Pix"
                    width={260}
                    height={260}
                    priority
                  />
                </div>
              ) : (
                <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                  QR Code não disponível no retorno.
                </div>
              )}

              <div>
                <p className="text-xs text-slate-500 mb-1">Copia e cola</p>
                <textarea
                  readOnly
                  value={qrCode ?? ""}
                  className="w-full h-24 rounded-md border border-border p-2 text-xs"
                />
                <button
                  type="button"
                  onClick={() => qrCode && copiarPix(qrCode)}
                  disabled={!qrCode}
                  className="mt-2 inline-flex items-center justify-center rounded-md border border-border bg-surface px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-surface-muted disabled:opacity-50"
                >
                  {copied ? "Copiado ✅" : "Copiar código Pix"}
                </button>
              </div>

              {expiresAt ? (
                <p className="text-xs text-slate-500">
                  Expira em: {new Date(expiresAt).toLocaleString("pt-BR")}
                </p>
              ) : null}
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

              {!tx.boleto_url && !tx.line ? (
                <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                  Boleto criado, mas os campos específicos não vieram no
                  retorno. Confira no dashboard Pagar.me.
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
