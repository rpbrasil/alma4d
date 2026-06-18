"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  FlaskConical,
  Smartphone,
  FileText,
  ShieldCheck,
  Building2,
  Handshake,
  CheckCircle2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";

export default function Alma4DExpress() {
  // Estados para validação do CNPJ
  const [cnpj, setCnpj] = useState("");
  const [cnpjStatus, setCnpjStatus] = useState<"idle" | "valid" | "error">(
    "idle",
  );
  const [cnpjHint, setCnpjHint] = useState("");
  const router = useRouter();
  const pathname = usePathname();

  const goEmpresa = () => {
    router.push(`/nr1/empresa?from=${encodeURIComponent(pathname)}`);
  };

  const goParceiros = () => {
    router.push(`/nr1/parceiros?from=${encodeURIComponent(pathname)}`);
  };

  // Estado para controlar o FAQ aberto
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Máscara e validação do CNPJ adaptada para React
  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "").slice(0, 14);

    // Aplica a máscara
    if (value.length > 12) {
      value = value.replace(
        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
        "$1.$2.$3/$4-$5",
      );
    } else if (value.length > 8) {
      value = value.replace(/^(\d{2})(\d{3})(\d{3})(\d{1,4})$/, "$1.$2.$3/$4");
    } else if (value.length > 5) {
      value = value.replace(/^(\d{2})(\d{3})(\d{1,3})$/, "$1.$2.$3");
    } else if (value.length > 2) {
      value = value.replace(/^(\d{2})(\d{1,3})$/, "$1.$2");
    }

    setCnpj(value);

    const digits = value.replace(/\D/g, "");
    if (digits.length === 0) {
      setCnpjStatus("idle");
      setCnpjHint("");
    } else if (digits.length < 14) {
      setCnpjStatus("error");
      setCnpjHint("Faltam dígitos — informe os 14 do CNPJ.");
    } else {
      setCnpjStatus("valid");
      setCnpjHint("CNPJ válido. Vamos calcular seu preço.");
    }
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <>
      {/* NAVIGATION */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-border transition-all">
        <div className="mx-auto flex max-w-285 h-20 items-center justify-between px-6 md:px-8">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/images/alma4d_express_nobground.png"
              alt="alma4D Express"
              width={110}
              height={32}
              priority
            />
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden items-center gap-2 text-sm font-medium text-neutral-500 sm:inline-flex mr-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-secondary opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-secondary"></span>
              </span>
              Menos de 5 min
            </span>
            <button
              onClick={goParceiros}
              className="hidden h-11 items-center justify-center rounded-xl border border-border bg-white px-6 font-sans font-bold text-sm text-brand transition-all duration-200 hover:border-brand hover:bg-neutral-50 sm:inline-flex"
            >
              Quero ser parceiro
            </button>

            <button
              onClick={goEmpresa}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-accent px-6 font-sans font-bold text-sm text-white shadow-md shadow-brand-accent/20 transition-all duration-200 hover:bg-brand-accent/90 hover:-translate-y-0.5 active:translate-y-0"
            >
              Iniciar agora
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section
        className="relative overflow-hidden bg-[radial-gradient(1200px_600px_at_80%_-20%,#f0f3ff_0,#fff_70%)] py-16 md:py-24 lg:py-32"
        id="hero"
      >
        <div className="mx-auto grid max-w-285 grid-cols-1 items-center gap-12 px-6 md:px-8 lg:grid-cols-[1.12fr_0.88fr] lg:gap-16">
          {/* Left Column: Copy */}
          <div className="space-y-6 max-w-2xl text-left">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand/5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-brand">
              ⚠️ NR-1 não é mais opcional
            </span>
            <h1 className="font-sans text-4xl font-black leading-[1.1] tracking-tight text-brand sm:text-5xl lg:text-6xl">
              Tire a NR-1 psicossocial do seu colo.{" "}
              <span className="text-brand-accent">Hoje.</span>
            </h1>
            <p className="text-lg leading-relaxed text-neutral-600 md:text-xl">
              Digite seu CNPJ e veja o preço na hora. Você aplica um
              questionário{" "}
              <b className="font-semibold text-neutral-900">
                científico e anônimo
              </b>{" "}
              e recebe o{" "}
              <b className="font-semibold text-neutral-900">
                relatório técnico
              </b>{" "}
              válido para fiscalização, GRO e PGR. Sem reuniões longas.
            </p>
            <ul className="space-y-3.5 pt-2">
              {[
                "Metodologia COPSOQ II BR validada cientificamente",
                "100% anônimo e em inteira conformidade com a LGPD",
                "Ativação instantânea — configure e comece em minutos",
              ].map((text, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3.5 font-sans font-medium text-base text-neutral-700"
                >
                  <span className="mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-full bg-brand-secondary text-xs font-bold text-white">
                    ✓
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          {/* Right Column: CNPJ Card */}
          <div className="rounded-2xl border border-border/80 bg-white p-8 shadow-xl shadow-brand/5 transition-all md:p-10 text-left">
            <span className="mb-6 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500"></span>{" "}
              Precificação automática
            </span>
            <h3 className="mb-1 font-sans text-2xl font-bold text-brand">
              Comece pelo seu CNPJ
            </h3>
            <p className="mb-6 text-sm text-neutral-500">
              Um campo. Preço na hora. Zero compromisso.
            </p>

            <div className="space-y-5">
              <div className="relative">
                <label
                  htmlFor="cnpj"
                  className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-500"
                >
                  CNPJ da sua empresa
                </label>

                <input
                  id="cnpj"
                  inputMode="numeric"
                  placeholder="00.000.000/0000-00"
                  autoComplete="off"
                  value={cnpj}
                  onChange={handleCnpjChange}
                  // ✅ REDIRECIONAMENTO
                  onFocus={goEmpresa}
                  onClick={goEmpresa}
                  className={`w-full p-4 font-sans font-bold tracking-wide border-2 rounded-xl outline-none transition-all duration-200
      ${
        cnpjStatus === "valid"
          ? "border-emerald-500 bg-emerald-50/20"
          : cnpjStatus === "error"
            ? "border-rose-500 bg-rose-50/20"
            : "border-border focus:border-brand focus:ring-4 focus:ring-brand/5"
      }`}
                />

                {cnpjStatus === "valid" && (
                  <span className="absolute right-4 bottom-4 text-xl">✅</span>
                )}

                {cnpjStatus === "error" && (
                  <span className="absolute right-4 bottom-4 text-xl">⚠️</span>
                )}
              </div>

              {cnpjHint && (
                <div
                  className={`-mt-2 px-1 text-xs font-medium ${
                    cnpjStatus === "valid"
                      ? "text-emerald-600"
                      : cnpjStatus === "error"
                        ? "text-rose-500"
                        : "text-neutral-400"
                  }`}
                >
                  {cnpjHint}
                </div>
              )}

              {/* ✅ BOTÃO CORRIGIDO */}
              <button
                onClick={goEmpresa}
                className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-brand-accent font-sans font-bold text-base text-white shadow-lg shadow-brand-accent/20 transition-all duration-200 hover:bg-brand-accent/90 hover:-translate-y-0.5 active:translate-y-0"
              >
                Ver meu preço agora →
              </button>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-neutral-100 pt-4 font-sans font-medium text-xs text-neutral-400">
              <span>🔒 LGPD Garantida</span>
              <span>📄 Emite Nota Fiscal</span>
              <span>⚡ Na hora</span>
            </div>
          </div>
        </div>
      </section>

      {/* URGENCY BAND */}
      <div className="bg-brand py-4 text-white shadow-sm">
        <div className="mx-auto flex max-w-285 flex-wrap items-center justify-center gap-3 px-6 text-center font-sans font-medium text-sm md:px-8 md:text-base">
          <span className="h-2 w-2 rounded-full bg-brand-secondary animate-ping"></span>
          <p>
            A fiscalização exige{" "}
            <b className="font-semibold text-brand-secondary">
              evidência documentada
            </b>{" "}
            — pesquisas genéricas ou caseiras não possuem validade jurídica.
          </p>
        </div>
      </div>

      {/* PROBLEM COMPACT */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-285 px-6 md:px-8">
          <div className="grid grid-cols-1 items-center gap-10 rounded-2xl bg-brand p-8 text-white shadow-2xl md:p-12 lg:grid-cols-2 lg:p-16 lg:gap-16">
            <div className="space-y-5 text-left">
              <span className="inline-flex items-center rounded-full bg-brand-secondary/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-brand-secondary">
                O que está em jogo
              </span>
              <h2 className="font-sans text-3xl font-black leading-tight md:text-4xl">
                O que você faz hoje resiste a uma fiscalização?
              </h2>
              <p className="text-base leading-relaxed text-neutral-400 md:text-lg">
                A NR-1 exige identificar, avaliar e mitigar riscos psicossociais
                dentro do GRO/PGR. Abordagens rasas expõem o negócio a{" "}
                <b className="font-semibold text-brand-secondary">
                  autuações pesadas, passivos trabalhistas e danos de marca.
                </b>
              </p>
              <div className="rounded-xl border border-brand-secondary/25 bg-brand-secondary/10 p-5 font-sans text-sm text-neutral-200 md:text-base">
                <b className="font-bold text-brand-secondary">A boa notícia:</b>{" "}
                Dá para adequar sua empresa com rigor científico de forma rápida
                e 100% digital com o alma4D Express.
              </div>
            </div>
            <div className="space-y-4 rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 text-left md:p-8">
              <p className="font-sans font-bold text-sm uppercase tracking-wide text-neutral-300">
                ❌ O que NÃO protege sua empresa legalmente:
              </p>
              <ul className="space-y-3.5">
                {[
                  "Pesquisas de clima organizacionais comuns",
                  "Formulários internos e caseiros sem validação científica",
                  "Ações soltas de endomarketing ou bem-estar (ex: palestras)",
                  "Ações sem documentação técnica estruturada em inventário",
                ].map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3 text-base text-neutral-300 md:text-lg"
                  >
                    <span className="mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-md bg-rose-500/15 text-xs font-bold text-rose-400">
                      ✕
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* JOURNEY (STEPS) */}
      <section
        className="border-y border-neutral-100 bg-neutral-50 py-20 md:py-28 text-center"
        id="jornada"
      >
        <div className="mx-auto max-w-285 px-6 md:px-8">
          <div className="mx-auto mb-16 max-w-2xl space-y-3">
            <span className="inline-flex items-center rounded-full bg-brand/5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-brand">
              A jornada
            </span>
            <h2 className="font-sans text-3xl font-black tracking-tight text-brand md:text-4xl">
              Do CNPJ ao relatório pronto em 6 passos
            </h2>
            <p className="text-lg text-neutral-500">
              Autonomia total para o seu RH. Sem depender de consultorias
              demoradas.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-6 text-left">
            {[
              { n: "1", t: "CNPJ", d: "Reconhecimento do porte da empresa." },
              {
                n: "2",
                t: "Preço Direto",
                d: "Sem necessidade de reuniões comerciais.",
              },
              {
                n: "3",
                t: "Ativação",
                d: "Checkout ágil com contrato e NF gerados.",
              },
              {
                n: "4",
                t: "Acessos",
                d: "Painel pronto para organizar as equipes.",
              },
              {
                n: "5",
                t: "Coleta",
                d: "Link direto e QR Code 100% anônimos.",
              },
              {
                n: "6",
                t: "Relatório",
                d: "Relatório técnico pronto para o PGR/GRO.",
              },
            ].map((s) => (
              <div
                key={s.n}
                className="group relative rounded-2xl border border-border bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg"
              >
                <div className="font-sans text-3xl font-black text-brand/30 transition-colors group-hover:text-brand">
                  {s.n}
                </div>
                <h4 className="mt-4 mb-2 font-sans font-bold text-base text-neutral-900">
                  {s.t}
                </h4>
                <p className="text-xs leading-relaxed text-neutral-500">
                  {s.d}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-12 font-sans text-lg font-bold tracking-tight text-brand">
            É simples assim. ⚡
          </p>
        </div>
      </section>

      {/* PILLARS */}
      <section className="py-20 md:py-28 text-center">
        <div className="mx-auto max-w-285 px-6 md:px-8">
          <div className="mx-auto mb-16 max-w-2xl space-y-3">
            <span className="inline-flex items-center rounded-full bg-brand/5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-brand">
              Por que funciona
            </span>
            <h2 className="font-sans text-3xl font-black tracking-tight text-brand md:text-4xl">
              Rigor científico desenhado para simplicidade
            </h2>
            <p className="mt-4 text-base leading-relaxed text-neutral-600 max-w-2xl mx-auto">
              A adoção de metodologias cientificamente validadas não é apenas
              uma boa prática — é um requisito essencial para garantir respaldo
              técnico e segurança jurídica no atendimento às exigências da NR‑1.
              A correta identificação e avaliação dos riscos psicossociais
              demanda rigor metodológico, rastreabilidade dos dados e aderência
              às normas vigentes do Ministério do Trabalho e Emprego.
            </p>

            <p className="mt-4 text-sm leading-relaxed text-neutral-500 max-w-2xl mx-auto">
              O alma4D Express foi concebido sob responsabilidade técnica do
              <b className="text-neutral-800"> Dr. Renato Purchio</b>, Médico do
              Trabalho, Registro de Qualificação de Especialista (RQE) nº 19126,
              com atuação reconhecida junto ao Ministério do Trabalho e Emprego,
              assegurando que toda a estrutura da plataforma esteja alinhada aos
              critérios técnicos, legais e científicos exigidos em processos de
              fiscalização e auditoria.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 text-left">
            {[
              {
                icon: FlaskConical,
                title: "COPSOQ II BR",
                desc: "A metodologia de maior prestígio internacional reconhecida e validada no Brasil.",
              },
              {
                icon: Smartphone,
                title: "Nativo Digital",
                desc: "Distribuição simplificada via canais digitais, sem atrito de cadastro, no celular do colaborador.",
              },
              {
                icon: FileText,
                title: "Inventário Técnico",
                desc: "Dados tabulados e prontos para alimentar a pasta de SST da empresa de forma facilitada.",
              },
              {
                icon: ShieldCheck,
                title: "Blindagem LGPD",
                desc: "Tratamento de dados preparado com anonimização completa para total segurança jurídica.",
              },
            ].map((p, i) => {
              const Icon = p.icon; // ✅ necessário

              return (
                <div
                  key={i}
                  className="space-y-3 rounded-xl border border-border border-l-4 border-l-brand bg-white p-6 shadow-sm md:p-8"
                >
                  <div className="text-3xl">
                    <Icon size={28} className="text-brand" />{" "}
                    {/* ✅ corrigido */}
                  </div>

                  <h4 className="font-sans font-bold text-lg text-neutral-900">
                    {p.title}
                  </h4>

                  <p className="text-sm leading-relaxed text-neutral-500">
                    {p.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SEGMENTATION */}
      <section
        className="border-t border-neutral-100 bg-neutral-50 py-20 md:py-28 text-center"
        id="portes"
      >
        <div className="mx-auto max-w-285 px-6 md:px-8">
          <div className="mx-auto mb-16 max-w-2xl space-y-3">
            <span className="inline-flex items-center rounded-full bg-brand/5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-brand">
              Para o seu porte
            </span>
            <h2 className="font-sans text-3xl font-black tracking-tight text-brand md:text-4xl">
              Uma solução sob medida para cada cenário
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 text-left">
            {[
              {
                border: "border-t-brand-secondary",
                tag: "Pequena · ME/EPP",
                tagColor: "text-brand-secondary",
                title: "Adequação sem custos ocultos.",
                desc: "Ideal para quem tem orçamento otimizado e precisa proteger o negócio contra riscos legais e fiscais rapidamente.",
                quote:
                  "Você não precisa de uma grande estrutura de SST interna para estar 100% em dia.",
                bullets: [
                  "Custo acessível formatado ao seu porte",
                  "Autogerenciável, sem consultores externos",
                  "Garante evidência protetiva técnica imediata",
                ],
                btnText: "Adequar agora →",
                href: "/nr1/empresa",
              },
              {
                border: "border-t-brand",
                tag: "Média Empresa",
                tagColor: "text-brand",
                title: "Autonomia completa + Respaldo.",
                desc: "Ideal para RHs estruturados que demandam velocidade e precisão na entrega dos documentos para a diretoria.",
                quote:
                  "Substitua planilhas e palpites por dados com validação científica internacional.",
                bullets: [
                  "Acompanhamento via Dashboard em tempo real",
                  "Relatório estruturado com validação de auditoria",
                  "Autonomia total sem depender de terceiros",
                ],
                btnText: "Garantir conformidade →",
                href: "/nr1/empresa",
              },
              {
                border: "border-t-brand-highlight",
                tag: "Grande Empresa",
                color: "brand-highlight",
                tagColor: "text-brand-highlight",
                title: "Escala, Governança e Controle.",
                desc: "Desenhado para múltiplas filiais, exigências rígidas de compliance de dados e demandas corporativas de BI.",
                quote:
                  "Padronize a conformidade de todas as suas unidades de operação sob o mesmo teto.",
                bullets: [
                  "Arquitetura preparada para múltiplas unidades",
                  "Filtros e relatórios consolidados ou isolados",
                  "Altos critérios de governança e LGPD corporativa",
                ],
                btnText: "Falar com especialistas →",
                href: "/nr1/empresa",
              },
            ].map((card, i) => (
              <div
                key={i}
                className={`flex flex-col border border-border rounded-2xl p-8 bg-white border-t-4 ${card.border} shadow-sm hover:shadow-md transition-shadow`}
              >
                <div
                  className={`font-sans font-bold text-xs tracking-wider uppercase mb-3 ${card.tagColor}`}
                >
                  {card.tag}
                </div>
                <h3 className="font-sans text-xl font-bold text-neutral-950 mb-3">
                  {card.title}
                </h3>
                <p className="text-sm leading-relaxed text-neutral-500 mb-4">
                  {card.desc}
                </p>
                <div className="border border-neutral-100 bg-neutral-50 p-4 font-sans text-xs italic leading-relaxed text-brand rounded-xl mb-6">
                  &ldquo;{card.quote}&rdquo;
                </div>
                <ul className="space-y-3 mb-8">
                  {card.bullets.map((b, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 text-sm text-neutral-600"
                    >
                      <span className="mt-0.5 text-xs font-bold text-brand-secondary">
                        ✓
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() =>
                    card.href === "/nr1/parceiros" ? goParceiros() : goEmpresa()
                  }
                  className="mt-auto flex h-12 w-full items-center justify-center rounded-xl bg-brand font-sans font-bold text-sm text-white transition-all hover:bg-brand/90"
                >
                  {card.btnText}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ACCESS / CTA SPLIT */}
      <section className="py-20 md:py-28 text-left" id="acesso">
        <div className="mx-auto max-w-285 px-6 md:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* Card Empresas */}
            <div className="flex flex-col rounded-2xl bg-linear-to-br from-brand to-brand-secondary p-8 text-white shadow-xl shadow-brand/10 md:p-12">
              <h3 className="flex items-center gap-3 font-sans text-2xl font-extrabold mb-2">
                <Building2 size={26} />
                Para Empresas
              </h3>
              <p className="text-sm leading-relaxed text-white/90">
                Emita o diagnóstico técnico obrigatório exigido pela
                fiscalização do trabalho.
              </p>
              <ul className="my-6 space-y-3 text-sm font-medium">
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={18} />
                  Questionário COPSOQ II BR anônimo
                </li>

                <li className="flex items-start gap-3">
                  <CheckCircle2 size={18} />
                  Inventário pronto integrado ao GRO/PGR
                </li>

                <li className="flex items-start gap-3">
                  <CheckCircle2 size={18} />
                  Ativação instantânea via painel digital
                </li>
              </ul>
              <button
                onClick={goEmpresa}
                className="mt-auto flex h-12 w-full items-center justify-center rounded-xl bg-gray-100 font-sans font-bold text-sm text-brand transition-all hover:bg-white"
              >
                Iniciar implantação →
              </button>
            </div>

            {/* Card Parceiros */}
            <div className="flex flex-col rounded-2xl border border-border bg-white p-8 shadow-sm md:p-12">
              <h3 className="flex items-center gap-3 font-sans text-2xl font-extrabold text-brand mb-2">
                <Handshake size={26} className="text-brand" />
                Para Parceiros
              </h3>

              <p className="text-sm leading-relaxed text-neutral-500">
                Conceda desconto para seus clientes ou associados na implantação
                da NR1 Psicossocial.
              </p>

              <ul className="my-6 space-y-3 text-sm font-medium text-neutral-600">
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-brand-secondary" />
                  Links e cupons trackeados com descontos
                </li>

                <li className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-brand-secondary" />
                  Kit de materiais de apoio técnico
                </li>

                <li className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-brand-secondary" />
                  Dashboard e relatório para acompanhar o engajamento.
                </li>
              </ul>

              <button
                onClick={goParceiros}
                className="mt-auto flex h-12 w-full items-center justify-center rounded-xl border border-border bg-gray-100 font-sans font-bold text-sm text-brand transition-all hover:border-brand hover:bg-neutral-50/50"
              >
                Quero ser parceiro →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section
        className="border-t border-border/60 bg-neutral-50 py-20 md:py-28 text-left"
        id="faq"
      >
        <div className="mx-auto max-w-190 px-6">
          <div className="mb-12 text-center space-y-3">
            <span className="inline-flex items-center rounded-full bg-brand/5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-brand">
              Perguntas frequentes
            </span>
            <h2 className="font-sans text-3xl font-black tracking-tight text-brand">
              Respostas diretas e sem rodeios
            </h2>
          </div>
          <div className="space-y-1">
            {[
              {
                q: "Já faço pesquisa de clima na empresa. Não basta?",
                a: "Não basta. Pesquisas internas comuns de clima não possuem metodologia científica validada. O Ministério do Trabalho exige embasamento técnico estruturado para riscos psicossociais, que é exatamente o que a escala COPSOQ II BR entrega no alma4D Express.",
              },
              {
                q: "É caro? Não aloquei verba para contratar grandes consultorias.",
                a: "Como removemos o intermediário humano, automatizamos a precificação e a geração dos relatórios direto pela plataforma, conseguimos democratizar o acesso por uma fração do preço cobrado por consultorias tradicionais de SST.",
              },
              {
                q: "O processo de implementação é muito complexo?",
                a: "Pelo contrário. O fluxo foi desenhado para ser self-service: insira o CNPJ, faça o pagamento do lote adequado de licenças, distribua o link customizado às equipes e baixe o relatório final assim que a amostragem for concluída.",
              },
              {
                q: "Existe algum risco de expor as respostas individuais do colaborador?",
                a: "Nenhum. A plataforma foi programada sob regras rígidas de anonimização. Os painéis e relatórios exibem apenas dados agregados e percentuais macro por setores, protegendo as informações de acordo com as normas da LGPD.",
              },
              {
                q: "Minha rotina está caótica, não tenho tempo para gerenciar isso agora.",
                a: "Você gasta menos de 5 minutos configurando o disparo. A partir daí, o plataforma digital gerencia e coleta as interações de forma automática, enquanto você foca nas suas tarefas prioritárias.",
              },
              {
                q: "Gostei do preço e quero comprar mais licenças, além das que preciso hoje, posso ?",
                a: "Pode. Você tem total deliberdade de comprar número maior de licenças. Estabelecemos um número mínimo de licenças para que o pedido não fique inviável financeiramente.",
              },
            ].map((item, index) => (
              <div className="border-b border-neutral-400" key={index}>
                <button
                  onClick={() => toggleFaq(index)}
                  className="flex w-full cursor-pointer items-center justify-between gap-4 border-none bg-transparent py-5 text-left font-sans text-base font-bold text-neutral-900 transition-colors hover:text-brand md:text-lg"
                >
                  <span>{item.q}</span>
                  <svg
                    className={`text-brand-secondary flex-none transition-transform duration-300 ${openFaq === index ? "rotate-180" : ""}`}
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M6 9l6 6 6-6"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 text-neutral-500 text-sm md:text-base leading-relaxed ${openFaq === index ? "max-h-62.5 pb-6" : "max-h-0"}`}
                >
                  <p>{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <details className="max-w-3xl mx-auto mt-6 mb-6 px-4 text-left">
        <summary
          className="cursor-pointer font-semibold text-brand border mt-4 mb-4 border-gray-300 bg-white shadow-sm hover:shadow rounded-lg px-4 py-3 hover:bg-gray-50 transition list-none appearance-none flex items-center justify-between
          [&::-webkit-details-marker]:hidden"
        >
          <span>Quero entender as exigências da NR‑1</span>
          <span className="text-xs opacity-70">▼</span>
        </summary>

        <div className="mt-4 text-slate-600">
          <h2 className="text-2xl font-extrabold text-brand">
            Como atender às exigências da NR‑1 sobre riscos psicossociais
          </h2>

          <p className="mt-4 text-slate-600">
            A NR‑1 exige que todas as empresas identifiquem, avaliem e controlem
            os riscos psicossociais dentro do Programa de Gerenciamento de
            Riscos (PGR). Esses riscos incluem fatores como estresse
            ocupacional, sobrecarga de trabalho, metas abusivas, assédio moral e
            falhas na organização do trabalho, que podem impactar diretamente a
            saúde mental e a produtividade dos colaboradores.
          </p>

          <p className="mt-4 text-slate-600">
            Para estar em conformidade com a NR‑1, não basta aplicar
            questionários simples ou ações isoladas de bem-estar. A norma exige
            uma abordagem estruturada e documentada, incluindo a utilização de
            metodologias reconhecidas, a geração de um inventário de riscos
            atualizado e a definição de um plano de ação com responsáveis,
            prazos e acompanhamento contínuo.
          </p>

          <p className="mt-4 text-slate-600">
            Ferramentas validadas cientificamente, como o COPSOQ II BR, permitem
            transformar fatores subjetivos do ambiente de trabalho em dados
            objetivos, garantindo maior segurança jurídica e evidência técnica
            para auditorias e fiscalizações.
          </p>

          <h3 className="mt-6 font-bold text-brand">
            O que a fiscalização da NR‑1 exige na prática
          </h3>

          <ul className="mt-4 space-y-2 text-slate-700">
            <li>
              • Identificação formal dos riscos psicossociais no ambiente de
              trabalho
            </li>
            <li>• Avaliação com metodologia validada e critérios técnicos</li>
            <li>• Inventário de riscos integrado ao PGR</li>
            <li>• Plano de ação com medidas preventivas e corretivas</li>
            <li>• Evidências documentadas disponíveis para auditoria</li>
          </ul>

          <p className="mt-4 text-slate-600">
            Empresas que não implementam corretamente essas exigências ficam
            expostas a autuações, passivos trabalhistas e riscos reputacionais.
            Por isso, o uso de soluções digitais com coleta estruturada,
            dashboards e relatórios técnicos automatizados tornou-se a forma
            mais eficiente e segura de atender à NR‑1.
          </p>

          <p className="mt-6 text-slate-700 font-medium">
            Com o avanço da fiscalização e a obrigatoriedade da inclusão dos
            riscos psicossociais no GRO e no PGR, a adequação à NR‑1 deixou de
            ser opcional e passou a ser uma exigência estratégica para qualquer
            organização.
          </p>
        </div>
      </details>
      {/* FOOTER */}
      <footer className="border-t border-white/5 bg-brand py-16 text-sm text-neutral-400 text-left">
        <div className="mx-auto max-w-285 px-6 md:px-8">
          <div className="mb-12 grid grid-cols-1 gap-10 md:grid-cols-[1.8fr_1fr_1fr_1fr] md:gap-8">
            <div className="space-y-4">
              <Link href="/" className="flex items-center gap-2">
                <Image
                  src="/images/alma4d_express_nobground.png"
                  alt="alma4D"
                  width={64}
                  height={64}
                />
              </Link>
              <p className="max-w-xs leading-relaxed text-xs text-neutral-400">
                A forma mais rápida, segura e automatizada de resolver a NR-1
                psicossocial — sem consultores, com relatórios técnicos
                inabaláveis.
              </p>
            </div>
            {[
              {
                title: "Produto",
                links: [
                  ["Como funciona", "#jornada"],
                  ["Por porte", "#portes"],
                  ["Seja Parceiro", "#acesso"],
                ],
              },
              {
                title: "Conformidade",
                links: [
                  ["Norma NR-1", "https://heyzine.com/flip-book/4757966bd8"],
                  [
                    "Escala COPSOQ II",
                    "https://heyzine.com/flip-book/4757966bd8",
                  ],
                  ["Termos de Uso", "/nr1/termos"],
                ],
              },
              {
                title: "Suporte",
                links: [
                  ["Falar com o time", "/contato"],
                  ["Central de Ajuda", "/contato"],
                  ["Politica de Privacidade", "/nr1/privacidade"],
                ],
              },
            ].map((col, i) => (
              <div key={i}>
                <h5 className="mb-4 font-sans font-bold text-xs uppercase tracking-wider text-white">
                  {col.title}
                </h5>
                <ul className="space-y-2.5 text-xs">
                  {col.links.map((link, idx) => (
                    <li key={idx}>
                      <a
                        href={link[1]}
                        className="transition-colors text-neutral-400 hover:text-white"
                      >
                        {link[0]}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap justify-between gap-4 border-t border-white/5 pt-8 text-xs text-neutral-500">
            <span>© 2026 alma4D · VOSS TECNOLOGIA</span>
          </div>
        </div>
      </footer>

      {/* PERSISTENT FLOATING BAR (DESKTOP) */}
      <div className="fixed bottom-6 left-1/2 z-60 hidden max-w-2xl -translate-x-1/2 items-center gap-6 rounded-full border border-border bg-white/45 p-2 pl-6 shadow-xl shadow-brand/10 backdrop-blur md:flex">
        <span className="font-sans font-bold text-xs uppercase tracking-wide text-neutral-700">
          Comece pelo seu CNPJ — leva menos de 5 min
        </span>

        <button
          onClick={goEmpresa}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-accent px-6 font-sans font-bold text-sm text-white shadow-md shadow-brand-accent/20 transition-all duration-200 hover:bg-brand-accent/90 hover:-translate-y-0.5 active:translate-y-0"
        >
          Iniciar agora →
        </button>
      </div>
    </>
  );
}
