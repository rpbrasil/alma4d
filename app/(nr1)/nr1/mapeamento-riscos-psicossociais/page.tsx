import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  ClipboardList,
  FileText,
  Users,
  Building2,
  Handshake,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import Image from "next/image"
// import { NR1SubNav } from "../_components/NR1SubNav";

export const metadata: Metadata = {
  title: "NR‑1 | Mapeamento de Riscos Psicossociais para GRO e PGR",
  description:
    "Mapeamento de riscos psicossociais conforme a NR‑1 com aplicação do COPSOQ II BR. Relatórios técnicos válidos para GRO e PGR, com LGPD e evidência para fiscalização.",
};

export default function PaginaNR1() {
  return (
    <main className="bg-background text-foreground">
      {/* ================= HERO ================= */}
      {/* <NR1SubNav /> */}
      <section className="px-6 py-14 bg-linear-to-b from-brand-highlight to-brand text-white">
        <div className="max-w-6xl mx-auto text-center">
          {/* ✅ LOGO */}
          <div className="flex justify-center mb-6">
            <Image
              src="/images/alma4d_express_nobground.png"
              alt="alma4D"
              width={120}
              height={120}
              className="animate-express-impact opacity-90"
              priority
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Mapeamento de Riscos Psicossociais conforme a NR‑1
          </h1>

          <p className="mt-6 text-lg text-white/90 max-w-3xl mx-auto">
            Aplicação do <b>COPSOQ II BR</b> com geração de relatórios técnicos
            válidos para fiscalização, GRO e PGR — com segurança jurídica e
            conformidade com a LGPD.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15">
              <ShieldCheck size={16} /> Conformidade NR‑1
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15">
              <FileText size={16} /> Evidência técnica
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15">
              <Users size={16} /> LGPD
            </span>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/nr1/empresa"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl
                         bg-white text-brand font-semibold hover:bg-white/90 transition"
            >
              Iniciar aplicação do questionário
              <ArrowRight size={18} />
            </Link>

            <Link
              href="/nr1/parceiros"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl
                         border border-white/40 text-white hover:bg-white/10 transition"
            >
              Sou parceiro alma4D
              <Handshake size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ================= NR‑1 ================= */}
      <section className="px-6 py-16 bg-surface">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-extrabold text-brand">
            O que a NR‑1 exige das empresas
          </h2>

          <p className="mt-4 text-slate-600">
            A Norma Regulamentadora nº 1 (NR‑1) determina que as organizações
            realizem a identificação, avaliação e controle dos riscos
            ocupacionais, incluindo os <b>riscos psicossociais</b>, no âmbito do
            Gerenciamento de Riscos Ocupacionais (GRO) e do Programa de
            Gerenciamento de Riscos (PGR).
          </p>

          <ul className="mt-6 space-y-3 text-slate-700">
            <li className="flex gap-2">
              <CheckCircle2
                size={18}
                className="text-brand-secondary shrink-0"
              />
              A fiscalização exige evidências documentadas.
            </li>
            <li className="flex gap-2">
              <CheckCircle2
                size={18}
                className="text-brand-secondary shrink-0"
              />
              Questionários sem metodologia validada não são aceitos.
            </li>
            <li className="flex gap-2">
              <CheckCircle2
                size={18}
                className="text-brand-secondary shrink-0"
              />
              Resultados devem constar no Inventário e Plano de Ação.
            </li>
          </ul>
        </div>
      </section>

      {/* ================= SOLUÇÃO ================= */}
      <section className="px-6 py-16 bg-surface-muted">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-extrabold text-brand">
            Como a alma4D atende à NR‑1
          </h2>

          <div className="mt-10 grid md:grid-cols-4 gap-6">
            {[
              {
                icon: ClipboardList,
                title: "COPSOQ II BR",
                text: "Instrumento validado cientificamente para avaliação de fatores psicossociais.",
              },
              {
                icon: Users,
                title: "Aplicação digital",
                text: "Questionário online, anônimo e responsivo.",
              },
              {
                icon: FileText,
                title: "Relatórios técnicos",
                text: "Inventário de riscos e Plano de Ação prontos para o PGR.",
              },
              {
                icon: ShieldCheck,
                title: "LGPD",
                text: "Resultados agregados, sem identificação individual.",
              },
            ].map((item) => {
              
              return (
                <div
                  key={item.title}
                  className="rounded-xl bg-surface border border-border p-6"
                >
                  <Image
                    src="/images/alma4d_express_nobground.png"
                    alt=""
                    width={64}
                    height={64}
                    className="opacity-80"
                  />
                  <p className="mt-4 font-bold text-brand">{item.title}</p>
                  <p className="mt-2 text-sm text-slate-600">{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= PARA QUEM ================= */}
      <section className="px-6 py-20 bg-surface">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-extrabold text-brand text-center">
            Escolha seu acesso
          </h2>

          <div className="mt-10 grid md:grid-cols-2 gap-8">
            {/* EMPRESAS */}
            <div className="rounded-2xl border border-border bg-surface p-8">
              <Building2 size={36} className="text-brand" />
              <h3 className="mt-4 text-xl font-bold text-brand">Empresas</h3>
              <p className="mt-2 text-slate-600">
                Para organizações que precisam cumprir a NR‑1 e gerar evidências
                técnicas para fiscalização.
              </p>

              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                <li className="flex gap-2">
                  <CheckCircle2 size={16} className="text-brand-secondary" />
                  Aplicação do COPSOQ
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 size={16} className="text-brand-secondary" />
                  Relatório técnico NR‑1
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 size={16} className="text-brand-secondary" />
                  Evidência para PGR
                </li>
              </ul>

              <Link
                href="/nr1/empresa"
                className="mt-6 inline-flex items-center gap-2 text-brand font-semibold hover:underline"
              >
                Começar aplicação <ArrowRight size={16} />
              </Link>
            </div>

            {/* PARCEIROS */}
            <div className="rounded-2xl border border-border bg-surface p-8">
              <Handshake size={36} className="text-brand" />
              <h3 className="mt-4 text-xl font-bold text-brand">
                Parceiros alma4D
              </h3>
              <p className="mt-2 text-slate-600">
                Para consultorias e profissionais que indicam empresas usando
                cupom próprio.
              </p>

              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                <li className="flex gap-2">
                  <CheckCircle2 size={16} className="text-brand-secondary" />
                  Comissão ou desconto
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 size={16} className="text-brand-secondary" />
                  Split automático
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 size={16} className="text-brand-secondary" />
                  Gestão de indicações
                </li>
              </ul>

              <Link
                href="/nr1/parceiros"
                className="mt-6 inline-flex items-center gap-2 text-brand font-semibold hover:underline"
              >
                Área do parceiro <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================= CTA FINAL ================= */}
      <section className="px-6 py-20 bg-brand text-white text-center">
        <h2 className="text-3xl font-extrabold">Pronto para atender à NR‑1?</h2>

        <p className="mt-4 text-white/90">
          Leva menos de 5 minutos para iniciar a aplicação do questionário.
        </p>

        <Link
          href="/nr1/empresa"
          className="mt-8 inline-flex items-center gap-2 px-8 py-3 rounded-xl
                     bg-white text-brand font-semibold hover:bg-white/90 transition"
        >
          Iniciar agora <ArrowRight size={18} />
        </Link>
      </section>
    </main>
  );
}
