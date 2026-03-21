import Link from "next/link";
import Image from "next/image";

export default function AppPage() {
  return (
    <div className="flex flex-col gap-24 py-12">
      {/* ================= HERO: VALIDAÇÃO DO LIVRO / APP ================= */}
      <section className="grid lg:grid-cols-2 gap-12 items-center px-4 md:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col gap-6 max-w-3xl">
          {/* Tag de Segurança para quem vem do QR Code */}
          <div className="bg-[#019499]/10 text-[#019499] px-4 py-1 rounded-full text-sm font-bold w-fit border border-[#019499]/20">
            ✓ Ambiente Oficial alma4D
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold text-[#030870] tracking-tight">
            Seja bem-vindo ao <br />
            Método em Ação
          </h1>

          <p className="text-xl text-foreground/80 leading-relaxed font-medium">
            Você leu o livro e agora tem a chave para a prática. O aplicativo
            alma4D é a extensão digital do seu conhecimento.
          </p>

          <div className="flex flex-wrap gap-4 pt-4">
            {/* Botão Principal em Destaque para o usuário do livro */}
            <Link
              href="/ativar-licenca"
              className="bg-[#030870] text-white px-8 py-4 rounded-full font-bold hover:bg-[#030870]/90 transition-all shadow-lg hover:scale-105"
            >
              Ativar minha Licença (Livro)
            </Link>

            <Link
              href="/download"
              className="border-2 border-[#030870]/20 text-[#030870] px-8 py-4 rounded-full font-bold hover:bg-surface-muted transition-all"
            >
              Baixar o App
            </Link>
          </div>

          <p className="text-sm text-foreground/50 italic">
            * Se você escaneou o QRCode do livro, verifique se está em{" "}
            <strong>alma4d.com.br</strong>
          </p>
        </div>

        {/* Mockup do App com Hydration Fix */}
        <div
          className="aspect-video rounded-3xl bg-surface-muted flex items-center justify-center border border-border/50 shadow-inner relative overflow-hidden"
          suppressHydrationWarning={true}
        >
          {/* Espaço para o vídeo ou mockup real */}
          <div className="text-foreground/30 font-semibold text-center p-8">
            [VÍDEO DEMONSTRATIVO: DO LIVRO PARA O CLIQUE]
          </div>
          {/* Overlay sutil de marca d'água */}
          <div className="absolute bottom-4 right-4 opacity-10">
            <Image src="/logo_alma.png" alt="logo" width={80} height={20} />
          </div>
        </div>
      </section>

      {/* ================= SEÇÃO DE VISIBILIDADE (O INFOGRÁFICO) ================= */}
      <section className="flex flex-col items-center gap-16 px-4 md:px-8 max-w-7xl mx-auto py-16">
        {/* Infográfico ampliado em coluna única */}
        <div
          className="w-full flex justify-center bg-white rounded-3xl p-4 md:p-10 shadow-xl border border-border/40"
          suppressHydrationWarning={true}
        >
          <Link
            href="/"
            className="w-full max-w-5xl hover:opacity-95 transition-opacity"
          >
            <Image
              src="/images/alma4d_resumo.png"
              alt="Ciclo de Inteligência alma4D"
              width={1407}
              height={791}
              className="w-full h-auto object-contain"
              priority
            />
          </Link>
        </div>

        <div className="flex flex-col gap-12 text-center items-center max-w-5xl">
          <div className="flex flex-col gap-6 max-w-3xl">
            <h2
              className="text-3xl md:text-5xl font-bold text-[#030870] tracking-tight"
              style={{ marginTop: "33px" }}
            >
              Visão clara da realidade organizacional
            </h2>
            <p className="text-xl md:text-2xl text-foreground/80 font-medium">
              O aplicativo traduz os dados psicossociais em{" "}
              <strong>estratégia visual</strong>, eliminando achismos na gestão
              de pessoas.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 text-left w-full">
            <div className="bg-surface-muted p-8 rounded-2xl border border-border/50">
              <h3 className="text-2xl font-bold text-[#030870] mb-4 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-[#030870] rounded-full inline-block"></span>
                Inteligência Prática
              </h3>
              <ul className="space-y-4 text-foreground/70">
                <li className="flex gap-2">
                  <strong>✓</strong> Indicadores de riscos em tempo real.
                </li>
                <li className="flex gap-2">
                  <strong>✓</strong> Dashboards por setor e departamento.
                </li>
                <li className="flex gap-2">
                  <strong>✓</strong> Foco total em saúde e produtividade.
                </li>
              </ul>
            </div>

            <div className="bg-surface-muted p-8 rounded-2xl border border-border/50">
              <h3
                className="text-2xl font-bold mb-4 flex items-center gap-2"
                style={{ color: "#019499" }}
              >
                <span
                  className="w-1.5 h-6 rounded-full inline-block"
                  style={{ backgroundColor: "#019499" }}
                ></span>
                Conformidade Técnica
              </h3>
              <ul className="space-y-4 text-foreground/70">
                <li className="flex gap-2">
                  <strong>✓</strong> Relatórios prontos para o GRO/PGR.
                </li>
                <li className="flex gap-2">
                  <strong>✓</strong> Inventário de Riscos automatizado.
                </li>
                <li className="flex gap-2">
                  <strong>✓</strong> Documentação para auditorias e compliance.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ================= CTA FINAL: COMBO OU INDIVIDUAL ================= */}
      <section className="max-w-7xl mx-auto px-4 w-full mb-24">
        <div className="bg-[#030870] text-white p-12 rounded-2rem text-center flex flex-col items-center gap-8 shadow-2xl relative overflow-hidden">
          {/* Elemento decorativo de fundo */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>

          <h2 className="text-3xl md:text-4xl font-bold">
            A experiência completa do alma4D
          </h2>
          <p className="text-xl text-blue-100 max-w-2xl">
            O aplicativo alcança seu potencial máximo quando utilizado em
            conjunto com o livro que fundamenta o método.
          </p>

          <div className="flex flex-wrap justify-center gap-6 z-10">
            <Link
              href="/oferta-combo"
              className="bg-[#019499] text-white px-10 py-4 rounded-full font-bold text-lg hover:scale-105 transition-all shadow-lg"
            >
              Quero o Combo: Livro + App
            </Link>
            <Link
              href="/ativar-licenca"
              className="bg-white text-[#030870] px-10 py-4 rounded-full font-bold text-lg hover:bg-blue-50 transition-all"
            >
              Já tenho o Livro (Ativar)
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
