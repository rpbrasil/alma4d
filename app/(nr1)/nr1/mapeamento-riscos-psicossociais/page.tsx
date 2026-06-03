import PaginaNR1Client from "@/components/nr1/PaginaNR1Client";

export const metadata = {
  title: "NR-1 Riscos Psicossociais | Mapeamento COPSOQ II BR e PGR",
  description:
    "Adequação completa à NR‑1 com mapeamento de riscos psicossociais através do COPSOQ II BR, relatório técnico para PGR e fiscalização.",
  alternates: {
    canonical: "https://alma4d.com.br/nr1/mapeamento-riscos-psicossociais",
  },
  openGraph: {
    title: "NR‑1 | Riscos Psicossociais com evidência técnica",
    description:
      "Mapeamento de riscos psicossociais conforme NR‑1 com COPSOQ II BR, dashboard e relatório técnico validado.",
    url: "https://alma4d.com.br/nr1/mapeamento-riscos-psicossociais",
    images: ["/images/og-nr1.png"],
  },
};

export default function Page() {
  return <PaginaNR1Client />;
}
