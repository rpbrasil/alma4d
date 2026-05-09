import type { Metadata } from "next";
import ContratoStatusClient from "./ContratoStatusClient";

export const metadata: Metadata = {
  title: "Contrato • NR‑1 • alma4D",
};

type PageProps = {
  params: {
    id: string;
  };
  searchParams: {
    order_id?: string;
  };
};

export default function Page({ params, searchParams }: PageProps) {
  const contratoId = params.id;

  // ✅ pode vir vazio (boleto / acesso direto)
  const orderId = searchParams?.order_id ?? "";

  return (
    <main className="min-h-screen bg-surface-muted">
      <ContratoStatusClient contratoId={contratoId} orderId={orderId} />
    </main>
  );
}
