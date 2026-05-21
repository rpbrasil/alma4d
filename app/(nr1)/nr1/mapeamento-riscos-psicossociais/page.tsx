"use client";

import { useState } from "react";
import Link from "next/link";
import {
  X,
  ShieldCheck,
  ClipboardList,
  FileText,
  Users,
  Building2,
  Handshake,
  CheckCircle2,
  ArrowRight,
  Search,
  Tag,
  Zap,
  QrCode,
  BarChart3,
} from "lucide-react";
import Image from "next/image";

const steps = [
  {
    icon: Search,
    title: "Captação & Inteligência",
    text: "O CNPJ é confirmado para preenchimento automático de dados e estimativa do risco da empresa.",
  },
  {
    icon: Tag,
    title: "Precificação Automática",
    text: "Precificação e aplicação de desconto automático no caso de cupom.",
  },
  {
    icon: Zap,
    title: "Ativação Instantânea",
    text: "Pagamento via checkout seguro com emissão de nota fiscal eletrônica, contrato e liberação imediata do Dashboard.",
  },
  {
    icon: Users,
    title: "Gestão de Acessos",
    text: "Inserção de colaboradores conforme o número de licenças adquiridas.",
  },
  {
    icon: QrCode,
    title: "Coleta de Dados",
    text: "Geração de links exclusivos e QR Codes para acesso anônimo e responsivo ao questionário de avaliação de riscos psicossociais.",
  },
  {
    icon: BarChart3,
    title: "Entrega Técnica",
    text: "Consolidação de dados em tempo real no Dashboard e geração do Relatório Técnico NR-1 para fiscalização.",
  },
];

export default function PaginaNR1() {
  const [modalOpen, setModalOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");

  const linkModeloRelatorio = "https://heyzine.com/flip-book/4757966bd8";

  // const openModal = (url: string) => {
  //   setPdfUrl(url);
  //   setModalOpen(true);
  //   if (typeof window !== "undefined") document.body.style.overflow = "hidden";
  // };

  const closeModal = () => {
    setModalOpen(false);
    setPdfUrl("");
    if (typeof window !== "undefined") document.body.style.overflow = "unset";
  };
  return (
    <>
      {modalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-5xl h-[90vh] bg-white rounded-2xl overflow-hidden flex flex-col shadow-2xl">
            {/* Cabeçalho do Modal */}
            <div className="flex items-center justify-between p-4 border-b bg-white">
              <h3 className="font-bold text-brand flex items-center gap-2">
                <FileText size={20} /> NR-1 | RISCOS PSICOSSOCIAIS
              </h3>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-slate-100 rounded-full transition"
              >
                <X size={24} className="text-slate-500" />
              </button>
            </div>

            {/* Container do Iframe */}
            <div className="flex-1 w-full bg-slate-50">
              <iframe
                src={pdfUrl}
                className="w-full h-full border-none"
                allowFullScreen
                allow="clipboard-write"
                scrolling="no"
              ></iframe>
            </div>
          </div>
        </div>
      )}
      <main className="bg-background text-foreground">
        {/* ================= HERO ================= */}
        <section className="px-6 py-14 bg-linear-to-b from-brand-highlight/50 to-brand text-white">
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
              Aplicação do <b>COPSOQ II BR</b> com geração de relatórios
              técnicos válidos para fiscalização, GRO e PGR — com segurança
              jurídica e conformidade com a LGPD.
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
                Iniciar implantação do questionário
                <ArrowRight size={18} />
              </Link>

              <Link
                href="/nr1/parceiros"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-white/40 text-white hover:bg-white/10 transition"
              >
                Quero ser parceiro alma4D
                <Handshake size={18} />
              </Link>
            </div>
            <div className="mt-10 flex justify-center">
              <button
                //onClick={() => openModal(linkModeloRelatorio)}
                onClick={() => window.open(linkModeloRelatorio, "_blank")}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-white/40 text-white hover:bg-white/10 transition"
              >
                Saiba mais sobre a NR-1
              </button>
            </div>
          </div>
        </section>

        {/* ================= NR‑1 ================= */}
        <section className="px-6 py-16 bg-surface">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-2xl font-extrabold text-brand mx-auto">
              O que a NR‑1 exige das empresas
            </h2>

            <p className="mt-4 text-slate-600">
              A Norma Regulamentadora nº 1 (NR‑1) determina que as organizações
              realizem a identificação, avaliação e controle dos riscos
              ocupacionais, incluindo os <b>riscos psicossociais</b>, no âmbito
              do Gerenciamento de Riscos Ocupacionais (GRO) e do Programa de
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
                Resultados devem incluir Inventário para elaboração do Plano de Ação.
              </li>
            </ul>
          </div>
        </section>

        {/* ================= SOLUÇÃO ================= */}
        <section className="px-6 py-16 bg-surface-muted">
          <div className="max-w-6xl mx-auto text-center">
            <h2 className="text-2xl font-extrabold text-brand mx-auto">
              Como alma4D atende à NR‑1
            </h2>

            <div className="mt-10 grid md:grid-cols-4 gap-6">
              {[
                {
                  icon: ClipboardList,
                  title: "COPSOQ II BR",
                  text: "Instrumento validado cientificamente para mapeamento de riscos psicossociais.",
                },
                {
                  icon: Users,
                  title: "Aplicação digital",
                  text: "Questionário online, anônimo e responsivo.",
                },
                {
                  icon: FileText,
                  title: "Relatórios técnicos",
                  text: "Inventário para elaboração do Plano de Gestão de Riscos.",
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

        <section className="px-6 py-20 bg-surface-muted">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-extrabold text-brand text-center">
              Jornada do Cliente alma4D
            </h2>

            <p className="mt-3 text-center text-slate-600 max-w-2xl mx-auto">
              Do primeiro acesso até a entrega técnica conforme a NR‑1.
            </p>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {steps.map((step, index) => {
                const Icon = step.icon;

                return (
                  <div
                    key={step.title}
                    className="relative group rounded-2xl border border-border bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-[#00E676]/60"
                  >
                    {/* Badge numérico */}
                    <div className="absolute -top-4 -left-4 w-12 h-12 flex items-center justify-center rounded-full bg-[#00E676] text-white text-xl font-bold shadow-lg ring-4 ring-white">
                      {index + 1}
                    </div>

                    {/* Ícone */}
                    <div className="w-12 h-12 rounded-xl bg-[#00E676]/10 flex items-center justify-center">
                      <Icon className="text-[#00E676]" size={22} />
                    </div>

                    {/* Conteúdo */}
                    <h3 className="mt-4 font-bold text-brand">{step.title}</h3>

                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                      {step.text}
                    </p>

                    {/* Linha visual conectiva (opcional leve) */}
                    <div className="pointer-events-none absolute inset-0 border rounded-2xl opacity-0 group-hover:opacity-100 transition border-[#00E676]/30" />
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
                  Para organizações que precisam cumprir a NR‑1 e gerar
                  evidências técnicas para fiscalização.
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
                    Evidência para Programa de Gestão de Riscos
                  </li>
                </ul>

                <Link
                  href="/nr1/empresa"
                  className="mt-6 inline-flex items-center gap-2 text-brand font-semibold hover:underline"
                >
                  Começar implantação <ArrowRight size={16} />
                </Link>
              </div>

              {/* PARCEIROS */}
              <div className="rounded-2xl border border-border bg-surface p-8">
                <Handshake size={36} className="text-brand" />
                <h3 className="mt-4 text-xl font-bold text-brand">
                  Parceiros alma4D
                </h3>
                <p className="mt-2 text-slate-600">
                  Para associações de empresas, consultorias e profissionais que
                  indicam empresas usando cupom próprio.
                </p>

                <ul className="mt-4 space-y-2 text-sm text-slate-700">
                  <li className="flex gap-2">
                    <CheckCircle2 size={16} className="text-brand-secondary" />
                    Desconto de associado
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 size={16} className="text-brand-secondary" />
                    Jornada de onboarding exclusiva
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
                  Seja nosso parceiro <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ================= CTA FINAL ================= */}
        <section className="px-6 py-20 bg-brand text-white text-center">
          <h2 className="text-3xl font-extrabold">
            Pronto para atender à NR‑1?
          </h2>

          <p className="mt-4 text-white/90">
            Leva menos de 5 minutos para iniciar a implantação do questionário.
          </p>

          <Link
            href="/nr1/empresa"
            className="mt-8 inline-flex items-center gap-2 px-8 py-3 rounded-xl
                     bg-white text-brand font-semibold hover:bg-white/90 transition"
          >
            Iniciar agora <ArrowRight size={18} />
          </Link>
          <div className="mt-10 flex justify-center">
            <button
              //onClick={() => openModal(linkModeloRelatorio)}
              onClick={() => window.open(linkModeloRelatorio, "_blank")}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-white/40 text-white hover:bg-white/10 transition"
            >
              Saiba mais sobre a NR-1
            </button>
          </div>
        </section>
      </main>
    </>
  );
}
