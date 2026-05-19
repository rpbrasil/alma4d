import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NR‑1 | Mapeamento de Riscos Psicossociais para GRO e PGR",
  description:
    "Mapeamento de riscos psicossociais conforme a NR‑1 com aplicação do COPSOQ II BR. Relatórios técnicos válidos para GRO e PGR, com LGPD e evidência para fiscalização.",
};

export default function NR1Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-muted overflow-x-hidden">
      {children}
    </div>
  );
}
