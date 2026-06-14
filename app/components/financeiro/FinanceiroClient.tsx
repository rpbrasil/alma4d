"use client";

import { useState, ReactNode } from "react";
import AlertasList from "./AlertasList";


type Props = {
  children: ReactNode;
};


export default function FinanceiroClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [alertaAberto, setAlertaAberto] = useState<string | null>(null);

  return (
    <>
      {/* injeta via cloneElement */}
      {typeof children === "object" && children !== null
        ? (children as Props)
        : children}

      {/* modal global */}
      {alertaAberto && (
        <AlertasList
          tipo={alertaAberto}
          onClose={() => setAlertaAberto(null)}
        />
      )}
    </>
  );
}
