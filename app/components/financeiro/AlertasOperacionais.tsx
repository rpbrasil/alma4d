"use client";

import { useState } from "react";
import AlertasList from "./AlertasList";

type Props = {
  nfseAtrasada: number | null;
  pagamentoSemEmail: number | null;
  boletoNaoEnviado: number | null;
  pixNaoEnviado: number | null;
};

export default function AlertasOperacionais({
  nfseAtrasada,
  pagamentoSemEmail,
  boletoNaoEnviado,
  pixNaoEnviado,
}: Props) {
  const [alertaAberto, setAlertaAberto] = useState<string | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* 🔴 NFSe atrasada */}
        <div
          onClick={() => setAlertaAberto("nfse_atrasada")}
          className="bg-brand-accent/10 text-brand-accent p-4 rounded-xl shadow-sm cursor-pointer hover:bg-brand-accent/20 transition"
        >
          <p className="text-xs font-medium uppercase tracking-wide">
            NFSe atrasada
          </p>
          <p className="text-2xl font-bold">{nfseAtrasada ?? 0}</p>
          <p className="text-xs opacity-80 mt-1">
            Nota emitida mas não enviada
          </p>
        </div>

        {/* 🟡 Pagamento sem email */}
        <div
          onClick={() => setAlertaAberto("pagamento_sem_email")}
          className="bg-brand-highlight/10 text-brand-highlight p-4 rounded-xl shadow-sm cursor-pointer hover:bg-brand-highlight/20 transition"
        >
          <p className="text-xs font-medium uppercase tracking-wide">
            Pagamento sem email
          </p>
          <p className="text-2xl font-bold">{pagamentoSemEmail ?? 0}</p>
          <p className="text-xs opacity-80 mt-1">Confirmação não enviada</p>
        </div>

        {/* 🟠 Boleto */}
        <div
          onClick={() => setAlertaAberto("boleto_nao_enviado")}
          className="bg-brand-secondary/10 text-brand-secondary p-4 rounded-xl shadow-sm cursor-pointer hover:bg-brand-secondary/20 transition"
        >
          <p className="text-xs font-medium uppercase tracking-wide">
            Boleto não enviado
          </p>
          <p className="text-2xl font-bold">{boletoNaoEnviado ?? 0}</p>
          <p className="text-xs opacity-80 mt-1">Cliente pode não pagar</p>
        </div>

        {/* 🔵 PIX fallback */}
        <div
          onClick={() => setAlertaAberto("pix_nao_enviado")}
          className="bg-brand/10 text-brand p-4 rounded-xl shadow-sm cursor-pointer hover:bg-brand/20 transition"
        >
          <p className="text-xs font-medium uppercase tracking-wide">
            PIX não enviado
          </p>
          <p className="text-2xl font-bold">{pixNaoEnviado ?? 0}</p>
          <p className="text-xs opacity-80 mt-1">Fallback não disparado</p>
        </div>
      </div>

      {alertaAberto && (
        <AlertasList
          tipo={alertaAberto}
          onClose={() => setAlertaAberto(null)}
        />
      )}
    </>
  );
}
