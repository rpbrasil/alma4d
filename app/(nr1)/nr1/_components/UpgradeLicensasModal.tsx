"use client";

import { useState } from "react";
import { NR1PaymentPanel } from "@/ativacao/_components/NR1PaymentPanel";
import Image from "next/image";
import { X, CreditCard, ArrowRight } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;

  userId: string;
  clienteId: string;
  contratoId: string;

  nomeCompleto: string;
  email: string;
  telefone: string;
  documento: string;

  limiteAtual: number;
  precoUnitario: number;
};

export function UpgradeLicencasModal({
  open,
  onClose,
  userId,
  clienteId,
  contratoId,
  nomeCompleto,
  email,
  telefone,
  documento,
  limiteAtual,
  precoUnitario,
}: Props) {
  const [qtd, setQtd] = useState(5);
  const [step, setStep] = useState<"form" | "payment">("form");

  const totalCents = Math.round(qtd * precoUnitario * 100);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl overflow-hidden">
        {/* HEADER */}
        <div className="relative border-b border-slate-200 px-5 py-4 bg-slate-50">
          <button
            onClick={() => {
              if (step === "payment") {
                if (!confirm("Escolha [OK] para cancelar o pagamento?")) return;
              }
              setStep("form");
              setQtd(5);
              onClose();
            }}
            className="absolute right-3 top-3 rounded-full p-2 hover:bg-slate-100"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white p-2 shadow-sm">
              <Image
                src="/images/alma4d_express_nobground.png"
                alt="logo"
                width={64}
                height={64}
              />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Expansão de contrato
              </p>
              <h2 className="text-lg font-semibold text-slate-900">
                Compra de licenças
              </h2>
            </div>
          </div>
        </div>

        {/* BODY */}
        <div className="p-5 space-y-5">
          {/* RESUMO */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-brand/20 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Limite atual</p>
              <p className="text-lg font-semibold">{limiteAtual}</p>
            </div>

            <div className="rounded-xl border border-brand/20 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Novo limite</p>
              <p className="text-lg font-semibold">{limiteAtual + qtd}</p>
            </div>
          </div>

          {/* STEP: FORM */}
          {step === "form" && (
            <>
              <div className="rounded-xl border border-brand/20 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-slate-600 text-sm">
                  <CreditCard size={16} />
                  <span>Preço por usuário</span>
                </div>

                <p className="mt-2 text-xl font-semibold">
                  R$ {precoUnitario.toFixed(2).replace(".", ",")}
                </p>
              </div>

              <div>
                <label className="text-sm text-slate-600">
                  Quantidade adicional
                </label>

                <input
                  type="number"
                  min={5}
                  value={qtd}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setQtd(v < 5 ? 5 : v);
                  }}
                  className="mt-2 w-full rounded-lg border border-brand/20 bg-brand/5 px-3 py-2 text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Mínimo de 5 licenças
                </p>
              </div>

              <div className="rounded-xl border border-brand/20 bg-brand/5 p-4">
                <p className="text-xs text-slate-600">Total a pagar</p>
                <p className="text-xl font-semibold text-brand">
                  R${" "}
                  {(totalCents / 100).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>

              <button
                onClick={() => setStep("payment")}
                disabled={qtd < 5}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-brand py-2 text-white font-semibold hover:brightness-95 disabled:opacity-60"
              >
                Continuar
                <ArrowRight size={16} />
              </button>
            </>
          )}

          {/* STEP: PAYMENT */}
          {step === "payment" && (
            <>
              {telefone ? (
                <NR1PaymentPanel
                  userId={userId}
                  clienteId={clienteId}
                  contratoId={contratoId}
                  funcionarios={qtd}
                  nomeCompleto={nomeCompleto || email}
                  email={email}
                  telefone={telefone}
                  documento={documento}
                  precoTotalCents={totalCents}
                  origem="upgrade"
                  operationType="upgrade"
                  quantidadeAdicional={qtd}
                  precoUnitario={precoUnitario}
                />
              ) : (
                <div className="text-sm text-red-600">
                  Telefone não encontrado. Atualize seus dados antes de pagar.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
