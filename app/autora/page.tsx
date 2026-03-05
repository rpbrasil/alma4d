import Image from "next/image";
import Link from "next/link";

export default function AutoraPage() {
  return (
    <div className="flex flex-col gap-24">
      {/* ================= HERO ================= */}
      <section className="grid lg:grid-cols-2 gap-12 items-center">
        {/* Texto */}
        <div className="flex flex-col gap-6 max-w-3xl">
          <h1 className="text-4xl sm:text-5xl font-bold text-brand">
            Fran Abbud
          </h1>

          <p className="text-xl text-foreground/80 leading-relaxed">
            Autora do livro <strong>Alma 4D</strong> e pesquisadora do cuidado
            integral do ser humano.
          </p>

          <p className="text-foreground/70 leading-relaxed">
            Sua trajetória une ciência, sensibilidade e experiência prática,
            construindo caminhos possíveis de bem-estar no cotidiano.
          </p>
        </div>

        {/* Imagem */}
        <div className="relative flex justify-center">
          {/* Imagem */}
          <Image
            src="/images/fran_nobg.jpg"
            alt="Fran Abbud"
            width={360}
            height={360}
            className="rounded-2xl object-cover relative z-10"
            priority
          />

          {/* Linha full-width alinhada ao bottom da imagem */}
          <div className="absolute bottom-0 left-1/2 h-1 w-screen -translate-x-1/2 bg-brand" />
        </div>
      </section>

      {/* ================= TRAJETÓRIA ================= */}
      <section className="flex flex-col gap-12">
        <div className="max-w-3xl flex flex-col gap-4">
          <h2 className="text-3xl font-bold">Trajetória</h2>
          <p className="text-foreground/70">
            Uma caminhada construída ao longo de décadas de escuta, estudo e
            prática.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="rounded-xl bg-surface-muted p-6">
            <h3 className="text-xl font-semibold mb-2">Formação</h3>
            <p className="text-foreground/70">
              Formada em Arquitetura e Urbanismo, Fran ampliou seu campo de
              atuação para o estudo do espaço humano — interno e externo.
            </p>
          </div>

          <div className="rounded-xl bg-surface-muted p-6">
            <h3 className="text-xl font-semibold mb-2">Experiência</h3>
            <p className="text-foreground/70">
              Atuou em Recursos Humanos na área da saúde e por 18 anos como
              Terapeuta Artística Antroposófica, acompanhando processos de
              transformação individual.
            </p>
          </div>

          <div className="rounded-xl bg-surface-muted p-6">
            <h3 className="text-xl font-semibold mb-2">Pesquisa contínua</h3>
            <p className="text-foreground/70">
              Com formação livre em Neuropsicologia do Desenvolvimento,
              Psicopedagogia, Monitoria de Museus (MAC-USP) e estudos em modos
              de vida saudáveis.
            </p>
          </div>
        </div>
      </section>

      {/* ================= VISÃO DE BEM-ESTAR ================= */}
      <section className="grid md:grid-cols-2 gap-12 items-center">
        <div className="flex flex-col gap-4">
          <h2 className="text-3xl font-bold">Visão de bem-estar</h2>

          <p className="text-foreground/70 leading-relaxed">
            O trabalho de Fran nasce da escuta atenta e da vivência com pessoas
            e grupos ao longo de muitos anos.
          </p>

          <p className="text-foreground/70 leading-relaxed">
            Para ela, o bem-estar não é um ideal distante, mas um caminho
            possível — construído diariamente por meio de escolhas conscientes,
            relações significativas e uma vida com sentido.
          </p>
        </div>

        <div className="aspect-video bg-surface-muted rounded-xl flex items-center justify-center text-foreground/50">
          {/* Imagem */}
          <div className="flex justify-center">
            <Image
              src="/images/sobremim2.jpeg"
              alt="Fran Abbud"
              width={360}
              height={360}
              className="rounded-2xl object-cover"
              priority
            />
          </div>
        </div>
      </section>

      {/* ================= O LIVRO ================= */}
      <section className="flex flex-col gap-12">
        <div className="max-w-3xl flex flex-col gap-4">
          <h2 className="text-3xl font-bold">O livro Alma 4D</h2>
          <p className="text-foreground/70">
            Uma síntese viva de sua trajetória e visão de cuidado integral.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="rounded-xl bg-surface-muted p-6">
            <p className="text-foreground/70 leading-relaxed">
              O <strong>Alma 4D</strong> nasce do princípio de que o bem-estar é
              uma construção consciente. Um caminho onde corpo, emoções, mente e
              propósito se integram ao cotidiano.
            </p>
          </div>

          <div className="rounded-xl bg-surface-muted p-6">
            <p className="text-foreground/70 leading-relaxed">
              Aqui, o autocuidado deixa de ser teoria e passa a estar nas mãos
              do leitor — como prática simples, viva e possível.
            </p>
          </div>
        </div>
      </section>

      {/* ================= CTA FINAL ================= */}
      <section className="rounded-2xl border border-border bg-surface p-10 flex flex-col gap-6">
        <h2 className="text-3xl font-bold">
          Conheça o método que sustenta o aplicativo
        </h2>

        <p className="text-foreground/70 max-w-2xl">
          O aplicativo alma4D, o livro e o método formam um único percurso de
          cuidado e consciência.
        </p>

        <div className="flex flex-wrap gap-4">
          <Link
            href="/livro"
            className="bg-brand text-white px-6 py-3 rounded-md font-medium hover:bg-brand/90 transition-colors"
          >
            Conhecer o Livro
          </Link>

          <Link
            href="/metodo"
            className="border border-border px-6 py-3 rounded-md font-medium hover:bg-surface-muted transition-colors"
          >
            Ver o Método
          </Link>
        </div>
      </section>
    </div>
  );
}
