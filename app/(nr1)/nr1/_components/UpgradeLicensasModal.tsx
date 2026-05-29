"use client";

import { useState, useMemo } from "react";
import { NR1PaymentPanel } from "@/ativacao/_components/NR1PaymentPanel";

type Props = {
  open: boolean;
  onClose: () => void;

  userId: string;
  clienteId: string;
  contratoId: string;

  nomeCompleto: string;
  email: string;
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
  documento,
  limiteAtual,
  precoUnitario,
}: Props) {
  const [qtd, setQtd] = useState(10);
  const [step, setStep] = useState<"form" | "payment">("form");

  const totalCents = useMemo(() => {
    return Math.round(qtd * precoUnitario * 100);
  }, [qtd, precoUnitario]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
      <div className="bg-white w-full max-w-md rounded-xl p-6 relative">
        {/* Botão fechar ✅ */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500"
        >
          ✕
        </button>

        <p className="text-sm text-gray-500 mt-1">
          Limite atual: <strong>{limiteAtual}</strong>
        </p>

        <p className="text-sm text-gray-500">
          Novo limite: <strong>{limiteAtual + qtd}</strong>
        </p>

        {step === "form" && (
          <>
            <h2 className="text-lg font-bold">Comprar licenças</h2>

            <p className="text-sm text-gray-500 mt-1">
              Preço por usuário:{" "}
              <strong>R$ {precoUnitario.toFixed(2).replace(".", ",")}</strong>
            </p>

            <input
              type="number"
              min={1}
              value={qtd}
              onChange={(e) => setQtd(Number(e.target.value))}
              className="mt-4 w-full border rounded px-3 py-2"
            />

            <div className="mt-4 text-lg font-bold">
              Total: R$ {(totalCents / 100).toFixed(2)}
            </div>

            <button
              onClick={() => setStep("payment")}
              className="mt-4 w-full bg-brand text-white py-2 rounded"
            >
              Continuar
            </button>
          </>
        )}

        {step === "payment" && (
          <NR1PaymentPanel
            userId={userId}
            clienteId={clienteId}
            contratoId={contratoId}
            funcionarios={qtd}
            nomeCompleto={nomeCompleto}
            email={email}
            documento={documento}
            precoTotalCents={totalCents}
            origem="upgrade"
            // ✅ agora compatível com o TS
            operationType="upgrade"
            quantidadeAdicional={qtd}
            precoUnitario={precoUnitario}
          />
        )}
      </div>
    </div>
  );
}