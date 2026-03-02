import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "O Método alma4D — Livro, Aplicativo e Prática Integrada",
  description:
    "Conheça o método alma4D: fundamentos no livro e prática no aplicativo. Um sistema integrado para compreender, aplicar e evoluir continuamente.",
  keywords: [
    "alma4D",
    "método alma4D",
    "livro alma4D",
    "aplicativo alma4D",
    "método integrado",
    "conhecimento e tecnologia",
    "prática contínua",
  ],
  alternates: {
    canonical: "/metodo",
  },
  openGraph: {
    title: "O Método alma4D",
    description:
      "Livro e aplicativo integrados em um método único: compreender, aplicar e evoluir continuamente.",
    type: "website",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "O Método alma4D",
    description:
      "Fundamentos no livro, prática no aplicativo — um método integrado para evolução contínua.",
  },
};

export default function MetodoPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "O método alma4D é só um aplicativo?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Não. O aplicativo é a parte prática. O método é sustentado pelo conteúdo do livro e pela integração entre compreensão e prática contínua.",
        },
      },
      {
        "@type": "Question",
        name: "Preciso do livro para usar o aplicativo?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Você pode usar o aplicativo, mas o livro aprofunda a compreensão e dá coerência ao processo, especialmente para consistência de longo prazo.",
        },
      },
      {
        "@type": "Question",
        name: "Qual a melhor forma de começar?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Se você valoriza base conceitual, comece pelo livro. Se precisa de prática imediata, comece pelo aplicativo e depois aprofunde no livro.",
        },
      },
      {
        "@type": "Question",
        name: "O que significa ‘um método vivo’?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Significa que o alma4D não é apenas conteúdo para consumir. Ele foi desenhado para ser vivido no cotidiano, com continuidade e evolução.",
        },
      },
      {
        "@type": "Question",
        name: "Existe oferta conjunta do livro com o aplicativo?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Sim. A oferta integrada foi pensada para entregar a experiência completa do método: fundamento conceitual e prática contínua.",
        },
      },
    ],
  };

  return (
    <div className="flex flex-col gap-24">
      {/* JSON-LD (FAQ) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* ================= HERO ================= */}
      <section className="flex flex-col gap-6 max-w-3xl">
        <h1 className="text-4xl sm:text-5xl font-bold text-brand">
          O Método alma4D
        </h1>

        <p className="text-xl text-foreground/80 leading-relaxed">
          O alma4D é um sistema integrado que conecta{" "}
          <strong>compreensão</strong> e <strong>aplicação prática</strong>.
        </p>

        <p className="text-foreground/70 leading-relaxed">
          O livro estrutura os fundamentos. O aplicativo transforma esses
          fundamentos em prática contínua — e o método mantém tudo coerente.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/livro"
            className="inline-flex items-center justify-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold hover:bg-surface-muted transition-colors"
          >
            Explorar o Livro
          </Link>

          <Link
            href="/app"
            className="inline-flex items-center justify-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold hover:bg-surface-muted transition-colors"
          >
            Ver o Aplicativo
          </Link>

          <Link
            href="/oferta"
            className="inline-flex items-center justify-center rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white hover:bg-brand-accent/90 transition-colors"
          >
            Livro + App
          </Link>
        </div>
      </section>

      {/* ================= ÍNDICE (UX + SEO) ================= */}
      <section className="rounded-2xl border border-border bg-surface p-8">
        <h2 className="text-2xl font-bold mb-4">Nesta página</h2>
        <ul className="grid sm:grid-cols-2 gap-3 text-foreground/70">
          <li>
            <a className="hover:underline" href="#o-que-e">
              O que é o método na prática
            </a>
          </li>
          <li>
            <a className="hover:underline" href="#dois-pilares">
              Os dois pilares: livro e aplicativo
            </a>
          </li>
          <li>
            <a className="hover:underline" href="#como-funciona">
              Como funciona (3 movimentos)
            </a>
          </li>
          <li>
            <a className="hover:underline" href="#beneficios">
              Benefícios do método
            </a>
          </li>
          <li>
            <a className="hover:underline" href="#para-quem">
              Para quem é
            </a>
          </li>
          <li>
            <a className="hover:underline" href="#como-comecar">
              Como começar
            </a>
          </li>
          <li>
            <a className="hover:underline" href="#experiencia-completa">
              Livro + App (experiência completa)
            </a>
          </li>
          <li>
            <a className="hover:underline" href="#faq">
              Perguntas frequentes
            </a>
          </li>
        </ul>
      </section>

      {/* ================= O QUE É ================= */}
      <section id="o-que-e" className="flex flex-col gap-6">
        <div className="max-w-3xl flex flex-col gap-3">
          <h2 className="text-3xl font-bold">
            O que é, na prática, o método alma4D
          </h2>
          <p className="text-foreground/70 leading-relaxed">
            O método alma4D existe para evitar dois extremos comuns: teoria sem
            aplicação (entender muito, mudar pouco) e prática sem fundamento
            (fazer muito, mas sem clareza).
          </p>
          <p className="text-foreground/70 leading-relaxed">
            Ele funciona como um eixo: você compreende a lógica no livro, aplica
            no aplicativo e consolida pela repetição consciente — criando
            continuidade e evolução.
          </p>
        </div>
      </section>

      {/* ================= DOIS PILARES ================= */}
      <section id="dois-pilares" className="flex flex-col gap-10">
        <div className="max-w-3xl flex flex-col gap-3">
          <h2 className="text-3xl font-bold">Os dois pilares do alma4D</h2>
          <p className="text-foreground/70 leading-relaxed">
            O método foi desenhado com dois pilares complementares: o livro dá
            fundamento e o aplicativo sustenta a prática.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="rounded-xl border border-border bg-surface p-8 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold">📘 O Livro (fundamento)</h3>
            <p className="text-foreground/70 leading-relaxed">
              O livro oferece conceitos, estrutura e visão. É onde você entende
              o “porquê” do sistema e ganha coerência para aplicar com
              consistência.
            </p>
            <Link
              href="/livro"
              className="mt-auto text-brand font-semibold hover:underline"
            >
              Explorar o Livro →
            </Link>
          </div>

          <div className="rounded-xl border border-border bg-surface p-8 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold">
              📱 O Aplicativo (prática)
            </h3>
            <p className="text-foreground/70 leading-relaxed">
              O aplicativo traduz os fundamentos em experiência prática:
              acompanhamento, continuidade e interação. Ele existe para reduzir
              fricção e aumentar consistência.
            </p>
            <div className="mt-auto flex flex-wrap gap-3">
              <Link
                href="/app"
                className="text-brand font-semibold hover:underline"
              >
                Ver o Aplicativo →
              </Link>
              <Link
                href="/download"
                className="text-brand-secondary font-semibold hover:underline"
              >
                Baixar o App →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================= COMO FUNCIONA ================= */}
      <section id="como-funciona" className="flex flex-col gap-10">
        <div className="max-w-3xl flex flex-col gap-3">
          <h2 className="text-3xl font-bold">
            Como o método funciona (3 movimentos)
          </h2>
          <p className="text-foreground/70 leading-relaxed">
            Você pode entender o método alma4D como um ciclo progressivo:
            compreender, aplicar e evoluir continuamente.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="rounded-xl bg-surface-muted p-6 flex flex-col gap-3">
            <h3 className="text-xl font-semibold">1) Compreensão</h3>
            <p className="text-foreground/70">
              Entenda fundamentos, vocabulário e lógica. Isso evita prática
              mecânica.
            </p>
          </div>
          <div className="rounded-xl bg-surface-muted p-6 flex flex-col gap-3">
            <h3 className="text-xl font-semibold">2) Aplicação</h3>
            <p className="text-foreground/70">
              A prática acontece no cotidiano. O app reduz fricção e sustenta
              consistência.
            </p>
          </div>
          <div className="rounded-xl bg-surface-muted p-6 flex flex-col gap-3">
            <h3 className="text-xl font-semibold">3) Evolução contínua</h3>
            <p className="text-foreground/70">
              Revisão e ajuste constantes: você não reinicia do zero — você
              evolui.
            </p>
          </div>
        </div>
      </section>

      {/* ================= BENEFÍCIOS ================= */}
      <section id="beneficios" className="flex flex-col gap-10">
        <div className="max-w-3xl flex flex-col gap-3">
          <h2 className="text-3xl font-bold">Benefícios do método alma4D</h2>
          <p className="text-foreground/70 leading-relaxed">
            O método é útil quando você busca coerência, clareza e continuidade
            — integrando teoria e prática sem fragmentação.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {[
            ["Coerência", "Um sistema com fundamento, sem atalhos desconexos."],
            ["Clareza", "Saber o que está fazendo e por quê."],
            ["Continuidade", "Sair do ciclo de “começa e para”."],
            ["Aplicação concreta", "Transformar leitura em ação consistente."],
          ].map(([title, desc]) => (
            <div
              key={title}
              className="rounded-xl border border-border bg-surface p-6"
            >
              <h3 className="text-xl font-semibold">{title}</h3>
              <p className="text-foreground/70 mt-2">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= PARA QUEM É ================= */}
      <section id="para-quem" className="flex flex-col gap-10">
        <div className="max-w-3xl flex flex-col gap-3">
          <h2 className="text-3xl font-bold">Para quem o método foi criado</h2>
          <p className="text-foreground/70 leading-relaxed">
            O alma4D faz mais sentido para quem busca método, fundamento e
            prática — com evolução consistente em vez de picos de motivação.
          </p>
        </div>

        <div className="rounded-2xl bg-surface-muted p-8">
          <ul className="list-disc list-inside space-y-3 text-foreground/70">
            <li>Quem quer um método (não só inspiração).</li>
            <li>Quem valoriza fundamento e prática no mesmo sistema.</li>
            <li>Quem busca continuidade e evolução no cotidiano.</li>
            <li>Quem prefere clareza a soluções fragmentadas.</li>
          </ul>
        </div>
      </section>

      {/* ================= COMO COMEÇAR ================= */}
      <section id="como-comecar" className="flex flex-col gap-10">
        <div className="max-w-3xl flex flex-col gap-3">
          <h2 className="text-3xl font-bold">Como começar</h2>
          <p className="text-foreground/70 leading-relaxed">
            Você pode iniciar por três caminhos. O melhor depende do seu
            momento: visão geral, base conceitual ou prática imediata.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="rounded-xl border border-border bg-surface p-6 flex flex-col gap-3">
            <h3 className="text-xl font-semibold">A) Começar pelo método</h3>
            <p className="text-foreground/70">
              Ideal para entender o sistema antes de escolher livro/app.
            </p>
            <div className="mt-auto flex flex-col gap-2">
              <Link
                href="/livro"
                className="text-brand font-semibold hover:underline"
              >
                Ir para o Livro →
              </Link>
              <Link
                href="/app"
                className="text-brand font-semibold hover:underline"
              >
                Ir para o App →
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6 flex flex-col gap-3">
            <h3 className="text-xl font-semibold">B) Começar pelo livro</h3>
            <p className="text-foreground/70">
              Ideal para construir base conceitual antes da prática.
            </p>
            <Link
              href="/livro"
              className="mt-auto text-brand font-semibold hover:underline"
            >
              Explorar o Livro →
            </Link>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6 flex flex-col gap-3">
            <h3 className="text-xl font-semibold">
              C) Começar pelo aplicativo
            </h3>
            <p className="text-foreground/70">
              Ideal para prática imediata — e depois aprofundar no livro.
            </p>
            <div className="mt-auto flex flex-col gap-2">
              <Link
                href="/download"
                className="text-brand-secondary font-semibold hover:underline"
              >
                Baixar o App →
              </Link>
              <Link
                href="/livro"
                className="text-brand font-semibold hover:underline"
              >
                Ver o Livro →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================= EXPERIÊNCIA COMPLETA ================= */}
      <section
        id="experiencia-completa"
        className="rounded-2xl border border-border bg-surface p-10 flex flex-col gap-6"
      >
        <h2 className="text-3xl font-bold">
          A experiência completa (Livro + App)
        </h2>

        <p className="text-foreground/70 max-w-3xl">
          O método alma4D alcança sua forma mais consistente quando livro e
          aplicativo são usados juntos: o livro sustenta o raciocínio e o
          aplicativo sustenta a prática.
        </p>

        <div className="flex flex-wrap gap-4">
          <Link
            href="/oferta"
            className="inline-flex items-center justify-center rounded-md bg-brand-accent px-6 py-3 text-white font-semibold hover:bg-brand-accent/90 transition-colors"
          >
            Ver Oferta Livro + App
          </Link>

          <Link
            href="/download"
            className="inline-flex items-center justify-center rounded-md border border-border px-6 py-3 font-semibold hover:bg-surface-muted transition-colors"
          >
            Baixar o App
          </Link>
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <section id="faq" className="flex flex-col gap-8">
        <h2 className="text-3xl font-bold">Perguntas frequentes</h2>

        <div className="grid gap-4">
          {[
            {
              q: "O método alma4D é só um aplicativo?",
              a: "Não. O aplicativo é a parte prática. O método é sustentado pelo conteúdo do livro e pela integração entre compreensão e prática contínua.",
            },
            {
              q: "Preciso do livro para usar o aplicativo?",
              a: "Você pode usar o aplicativo, mas o livro aprofunda a compreensão e dá coerência ao processo, especialmente para consistência de longo prazo.",
            },
            {
              q: "Qual a melhor forma de começar?",
              a: "Se você valoriza base conceitual, comece pelo livro. Se precisa de prática imediata, comece pelo aplicativo e depois aprofunde no livro.",
            },
            {
              q: "O que significa ‘um método vivo’?",
              a: "Significa que o alma4D não é apenas conteúdo para consumir. Ele foi desenhado para ser vivido no cotidiano, com continuidade e evolução.",
            },
            {
              q: "Existe oferta conjunta do livro com o aplicativo?",
              a: "Sim. A oferta integrada foi pensada para entregar a experiência completa do método: fundamento conceitual e prática contínua.",
            },
          ].map((item) => (
            <div
              key={item.q}
              className="rounded-xl border border-border bg-surface p-6"
            >
              <h3 className="text-xl font-semibold">{item.q}</h3>
              <p className="text-foreground/70 mt-2">{item.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
