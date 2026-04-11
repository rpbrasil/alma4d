import Link from "next/link";
import Image from "next/image";
import PhoneMockupVideo from "../components/mockups/PhoneMockupVideo";

export default function AppPage() {
  return (
    <div className="flex flex-col gap-24">
      {/* ================= HERO ================= */}
      <section className="grid lg:grid-cols-2 gap-12 items-center">
        {/* Texto */}
        <div className="flex flex-col gap-6 max-w-3xl">
          <h1 className="text-4xl sm:text-5xl font-bold text-brand">
            O Aplicativo alma<span className="text-[#019499]">4D</span>
          </h1>

          <p className="text-xl text-foreground/80 leading-relaxed">
            Inteligência aplicada ao cuidado com pessoas e à gestão de riscos
            psicossociais.
          </p>

          <p className="text-foreground/70 leading-relaxed">
            <strong className="text-2xl">
              <span className="text-[#030870]">alma</span>
              <span className="text-[#019499]">4D</span>
            </strong>{" "}
            é um aplicativo que auxilia pessoas físicas na gestão do
            autocuidado. Profissionais de saúde, bem-estar e desenvolvimento
            humano podem acompanhar a jornada de seus clientes, oferecendo
            orientações e acompanhamentos personalizados. Nas organizações, o
            aplicativo apoia programas de bem‑estar e qualidade de vida no
            trabalho, permitindo o mapeamento de riscos psicossociais, a geração
            de indicadores agregados e a emissão de relatórios alinhados às
            exigências legais e às boas práticas de gestão.
          </p>

          <div className="flex flex-wrap gap-4 pt-4">
            <Link
              href="/download"
              className="bg-[#DF633F] text-white px-6 py-3 rounded-md font-medium hover:bg-brand/90 transition-colors"
            >
              Baixar o App
            </Link>

            <Link
              href="/livro"
              className="border border-border px-6 py-3 rounded-md font-medium hover:bg-surface-muted transition-colors"
            >
              Conhecer o Livro
            </Link>
          </div>
        </div>

        {/* Mockup */}
        {/* Seção do Vídeo alma4D */}
        {/* <div className="w-full max-w-4xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-12 items-center"> */}
        <div className="w-full max-w-4xl mx-auto px-4 grid  gap-12 items-center">
          {/* Texto Explicativo (Lado Esquerdo) */}
          {/* <div className="space-y-6 order-2 md:order-1">
            <div className="inline-block px-3 py-1 rounded-full bg-[#019499]/10 text-[#019499] text-xs font-bold tracking-wider uppercase">
              Tecnologia Integrativa
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#030870] leading-tight">
              Sinta o app na{" "}
              <span className="text-[#019499]">palma da mão</span>.
            </h2>
            <p className="text-slate-600 leading-relaxed font-medium">
              Explore a consciência corporal através de um fluxo intuitivo.
              Escaneie seu livro, ative seu perfil e inicie sua jornada de
              autoconhecimento em segundos.
            </p>
            <ul className="space-y-3">
              {[
                "Ativação por QR Code",
                "Sincronização em tempo real",
                "Dashboard de Interocepção",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3 text-sm font-semibold text-slate-700"
                >
                  <svg
                    className="w-5 h-5 text-[#019499]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="3"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div> */}

          {/* O Mockup (Lado Direito) */}
          <div className="flex flex-col gap-24 overflow-x-hidden md:overflow-x-visible">
            <PhoneMockupVideo videoSrc="/videos/alma4d.mp4" />
          </div>
        </div>
      </section>

      {/* ================= O QUE O APP FAZ ================= */}
      <section className="flex flex-col gap-12">
        <div className="max-w-3xl flex flex-col gap-4">
          <h2 className="text-3xl font-bold">Versões do Aplicativo</h2>
          <p className="text-foreground/70">
            No melhor conceito de ecossistema, o aplicativo contempla todos os
            componentes e tem versões para: indivíduos, profissionais e
            empresas.
          </p>
        </div>

        {/* ===== FULL BLEED NO MOBILE ===== */}
        <div className="-mx-4 sm:mx-0 overflow-hidden">
          <Image
            src="/images/alma4d-usuarios.png"
            alt="Infográfico Ciclo alma4D"
            width={1000}
            height={957}
            sizes="100vw"
            className="block w-full h-auto object-contain"
            priority
          />
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            [
              "Individual",
              "Para a pessoa física, o aplicativo atua como um companheiro de jornada. Ele ajuda a organizar a navegação pessoal, registrar o percurso, identificar padrões e oferecer análises, insights e sugestões inteligentes, sempre respeitando o ritmo, o perfil e as escolhas de cada indivíduo.",
            ],
            [
              "Profissional",
              "Médicos, psicólogos, terapeutas e consultores podem acompanhar a jornada de seus clientes de forma estruturada, visualizar evoluções ao longo do tempo e, quando autorizado, integrar atendimentos, orientações e agendamentos diretamente à prática profissional.",
            ],
            [
              "Empresarial",
              "Nas organizações, o aplicativo apoia programas de bem‑estar e qualidade de vida no trabalho, permitindo o mapeamento de riscos psicossociais, a geração de indicadores agregados e a emissão de relatórios alinhados às exigências legais e às boas práticas de gestão.",
            ],
          ].map(([title, text]) => (
            <div key={title} className="rounded-xl bg-surface-muted p-6">
              <h3 className="text-xl font-semibold mb-2">{title}</h3>
              <p className="text-foreground/70 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= GALERIA ================= */}
      <section className="flex flex-col gap-12">
        <div className="max-w-3xl flex flex-col gap-4">
          <h2 className="text-3xl font-bold">
            Uma experiência segura desde o primeiro acesso
          </h2>
          <p className="text-foreground/70">
            Ao entrar no aplicativo, cada usuário acessa apenas o que faz
            sentido para o seu papel.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-stretch">
          {/* ===== COLUNA 1: FLUXO ===== */}
          <div className="relative aspect-video bg-surface-muted rounded-xl overflow-hidden">
            <Image
              src="/images/alma4d-fluxo-site-semtxt.png"
              alt="Fluxo do método alma4D"
              fill
              className="object-contain p-4" // 'p-4' evita que a imagem encoste nas bordas
              priority
            />
          </div>

          {/* ===== COLUNA 2: MOCKUP ===== */}
          <div className="relative aspect-video bg-surface-muted rounded-xl overflow-hidden">
            <Image
              src="/images/mockup_misto.png"
              alt="alma4D"
              fill
              className="object-contain p-4"
              priority
            />
          </div>
        </div>
      </section>

      {/* ================= CTA FINAL ================= */}
      <section className="rounded-2xl border border-border bg-surface p-1 flex flex-col gap-6">
        <h2 className="text-3xl font-bold">
          A experiência completa do{" "}
          <span className="text-4xl">
            <span className="text-[#030870]">alma</span>
            <span className="text-[#019499]">4D</span>
          </span>
        </h2>
        <div className="text-foreground/70 w-full lg:max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2 md:p-4">
            {/* A.I. & Dados */}
            <div className="flex gap-4 p-5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all">
              <div className="text-2xl text-[#019499] shrink-0">🤖</div>{" "}
              {/* shrink-0 impede o emoji de espremer */}
              <div>
                <h3 className="font-bold text-[#030870] mb-1">A.I. & Dados</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Tira o peso das escolhas, colocando a{" "}
                  <strong>tecnologia</strong> para analisar as{" "}
                  <strong>tendências de saúde</strong>.
                </p>
              </div>
            </div>

            {/* Gamificação */}
            <div className="flex gap-4 p-5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all">
              <div className="text-2xl text-[#019499] shrink-0">🏆</div>
              <div>
                <h3 className="font-bold text-[#030870] mb-1">Gamificação</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Soluciona o maior problema do bem-estar, que é a falta de{" "}
                  <strong>motivação a longo prazo</strong>.
                </p>
              </div>
            </div>

            {/* Conectividade */}
            <div className="flex gap-4 p-5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all">
              <div className="text-2xl text-[#019499] shrink-0">🌐</div>
              <div>
                <h3 className="font-bold text-[#030870] mb-1">Conectividade</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Mostra que o <strong>profissional</strong> não está distante
                  do seu cliente, mas conectado e atento, acompanhando o
                  processo de perto.
                </p>
              </div>
            </div>

            {/* Pragmatismo Corporativo */}
            <div className="flex gap-4 p-5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all">
              <div className="text-2xl text-[#019499] shrink-0">🏢</div>
              <div>
                <h3 className="font-bold text-[#030870] mb-1">
                  Pragmatismo Corporativo
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Resolve o <strong>Mapeamento Psicossocial da NR-1</strong> de
                  forma leve e <strong>automatizada</strong>, sem burocracia
                  excessiva.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/download"
            className="bg-brand text-white px-6 py-3 rounded-md font-medium hover:bg-brand/90 transition-colors"
          >
            Livro + App
          </Link>

          <Link
            href="/download"
            className="bg-[#DF633F] border border-border px-6 py-3 rounded-md font-medium hover:bg-surface-muted transition-colors"
          >
            Baixar o App
          </Link>
        </div>
      </section>
    </div>
  );
}
