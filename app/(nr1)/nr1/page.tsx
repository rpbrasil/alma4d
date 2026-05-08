import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import MetodoModal from "../../components/MetodoModal";

export const metadata: Metadata = {
  title: "O Método alma4D — Consciência e Tecnologia Integradas",
  description:
    "O alma4D une os fundamentos do livro à prática do aplicativo. Um ecossistema de alfabetização corporal, monitoramento por IA e conformidade NR-1.",
  keywords: [
    "alma4D",
    "método alma4D",
    "NR-1 riscos psicossociais",
    "interocepção",
    "bem-estar corporativo",
    "IA saúde",
  ],
};

export default function MetodoPage() {
  
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "O que é o Método alma4D?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "É um sistema integrado que une a base conceitual do livro à prática tecnológica do aplicativo para elevar o padrão de bem-estar através das 4 Dimensões de Avaliação.",
        },
      },
      {
        "@type": "Question",
        name: "Como o app ajuda na NR-1?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "O alma4D operacionaliza o mapeamento de riscos psicossociais exigido pela NR-1, gerando relatórios analíticos e soluções acionáveis para empresas.",
        },
      },
    ],
  };

  return (
    // overflow-x-hidden no container principal é a última linha de defesa contra scroll lateral
    <div className="flex flex-col gap-20 pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* ================= HERO SECTION ================= */}
      <section className="grid lg:grid-cols-2 gap-12 items-center pt-10">
        <div className="flex flex-col gap-6">
          <div className="inline-block w-fit px-3 py-1 rounded-full bg-brand/10 text-xs font-bold tracking-widest uppercase text-[#DF633F]">
            O Próximo Nível do seu Bem-Estar
          </div>
          <h2 className="text-4xl sm:text-6xl font-extrabold text-[#030870] leading-tight">
            alma4D: Um <span className="text-[#019499]">Método Vivo</span>.
          </h2>
          <p className="text-xl text-slate-600 leading-relaxed">
            Onde o <strong>fundamento teórico</strong> do livro encontra a{" "}
            <strong>inteligência prática</strong> do aplicativo.
          </p>
          <div className="flex flex-wrap gap-4 pt-4">
            <MetodoModal />
            <Link
              href="/download"
              className="bg-slate-50 rounded-xl border-2 border-slate-200 px-8 py-4 font-bold hover:bg-slate-50 transition-all text-center"
            >
              Baixar o App
            </Link>
          </div>
        </div>
        <div className="relative group w-full">
          <div className="absolute inset-0 bg-[#019499]/5 blur-3xl rounded-full -z-10 animate-none sm:animate-pulse" />
          <div className="relative rounded-3xl overflow-hidden border border-slate-100 shadow-2xl bg-white">
            <Image
              src="/images/deviceframes.webp"
              alt="Infográfico alma4D"
              width={1612}
              height={1000}
              className="w-full h-auto object-contain"
              priority
              fetchPriority="high"
            />
          </div>
        </div>
      </section>

      {/* ================= OS TRÊS PILARES ================= */}
      <section
        id="como-funciona"
        className="grid md:grid-cols-3 gap-8 px-1 md:px-0"
      >
        <div className="p-8 rounded-3xl bg-white border border-slate-100 shadow-sm">
          <div className="text-4xl mb-4">📘</div>
          <h3 className="text-xl font-bold text-[#030870] mb-3">
            1. O Mapa (Livro)
          </h3>
          <p className="text-slate-600 text-sm leading-relaxed">
            Alcance o bem-estar integral. Compreenda as 4 dimensões e transforme
            sua rotina em um ritual de geração de energia vital.
          </p>
        </div>
        <div className="p-8 rounded-3xl bg-white border border-slate-100 shadow-sm ring-2 ring-[#019499]/20">
          <div className="text-4xl mb-4">📱</div>
          <h3 className="text-xl font-bold text-[#030870] mb-3">
            2. O GPS (Aplicativo)
          </h3>
          <p className="text-slate-600 text-sm leading-relaxed">
            A prática no cotidiano. Registro das dimensões,{" "}
            <strong>análises por I.A.</strong> e gamificação para manter a
            motivação sem esquecer o propósito.
          </p>
        </div>
        <div className="p-8 rounded-3xl bg-[#030870] text-white shadow-xl shadow-blue-900/20">
          <div className="text-4xl mb-4">🚀</div>
          <h3 className="text-xl font-bold mb-3 text-white">3. A Evolução</h3>
          <p className="text-blue-100 text-sm leading-relaxed">
            Onde a teoria e prática se tornam{" "}
            <strong>estratégia de vida</strong>. Resultados percebidos para
            todos os níveis.
          </p>
        </div>
      </section>

      {/* ================= PARA QUEM É ================= */}
      <section className="flex flex-col gap-12 px-1 md:px-0">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-[#030870]">
            Impacto em todas as esferas
          </h2>
          <p className="text-slate-500 mt-4">
            Uma solução integrada para diferentes necessidades.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="p-8 rounded-3xl bg-slate-50 border border-transparent hover:border-[#019499]/30 transition-all">
            <h4 className="font-bold text-[#030870] mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                👤
              </span>
              Para Você
            </h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              Saia do automático. Utilize a I.A. do app para ajustar sua rotina
              e fortalecer sua saúde.
            </p>
          </div>
          <div className="p-8 rounded-3xl bg-slate-50 border border-transparent hover:border-[#019499]/30 transition-all">
            <h4 className="font-bold text-[#030870] mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                🩺
              </span>
              Para Profissionais
            </h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              Engajamento clínico total. Acompanhe os relatórios da jornada do
              cliente e envie mensagens em tempo real.
            </p>
          </div>
          <div className="p-8 rounded-3xl bg-slate-50 border border-transparent hover:border-[#019499]/30 transition-all">
            <h4 className="font-bold text-[#030870] mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                🏢
              </span>
              Para Empresas
            </h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              Conformidade <strong>NR-1</strong>. Automatize o mapeamento de
              riscos psicossociais e promova produtividade sustentável.
            </p>
          </div>
        </div>
      </section>

      {/* ================= FAQ SIMPLIFICADO ================= */}
      <section
        id="faq"
        className="max-w-4xl mx-auto w-full space-y-8 px-1 md:px-0"
      >
        <h2 className="text-3xl font-bold text-[#030870] text-center">
          Dúvidas Frequentes
        </h2>
        <div className="grid gap-4">
          {[
            {
              q: "O método é só um aplicativo?",
              a: "Não. O app é a ferramenta de execução. O método é a união da inteligência do livro com a prática guiada pela tecnologia.",
            },
            {
              q: "O alma4D substitui acompanhamento médico?",
              a: "Não. Ele complementa o trabalho dos profissionais, compartilhando dados para acompanhamento, facilitando o agendamento de consultas e a troca de mensagens.",
            },
            {
              q: "Como o app resolve a NR-1?",
              a: "Gera relatórios oficiais para mapeamento de riscos psicossociais, facilitando a gestão de RH.",
            },
          ].map((faq, i) => (
            <details
              key={i}
              className="group p-6 rounded-2xl border border-slate-100 bg-white hover:border-[#019499]/20 transition-all cursor-pointer"
            >
              <summary className="font-bold text-[#030870] list-none flex justify-between items-center outline-none">
                {faq.q}
                <span className="text-[#019499] group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>
              <p className="text-slate-600 mt-4 text-sm leading-relaxed">
                {faq.a}
              </p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
