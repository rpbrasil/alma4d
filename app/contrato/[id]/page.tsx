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

export default async function Page({ params }: PageProps) {
  
  const contratoId = params.id;
if (!contratoId) return null;
  return <ContratoStatusClient contratoId={contratoId} />;
}
