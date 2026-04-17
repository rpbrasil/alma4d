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
            Autora do livro <strong>Arquitetura Viva do Autocuidado</strong> e
            pesquisadora do bem-estar integral do ser humano.
          </p>

          <p className="text-foreground/70 leading-relaxed">
            Conhecimento, sensibilidade e experiência prática, transformando
            vidas ao longo de 30 anos de trajetória.
          </p>
        </div>

        {/* Imagem */}
        <div className="relative flex justify-center">
          {/* Imagem */}
          <Image
            src="/images/fran_book_bw.jpeg"
            alt="Fran Abbud"
            width={360}
            height={360}
            className="rounded-2xl object-cover relative z-10"
            priority
          />

          {/* Linha full-width alinhada ao bottom da imagem */}
          <div className="absolute bottom-0 left-1/2 h-1 w-screen -translate-x-1/2 bg-[#DF633F]" />
        </div>
      </section>

      {/* ================= TRAJETÓRIA ================= */}
      <section className="flex flex-col gap-12">
        <div className="max-w-3xl flex flex-col gap-4">
          <h2 className="text-3xl font-bold">Trajetória</h2>
          <p className="text-foreground/70"></p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="rounded-xl bg-surface-muted p-6">
            <h3 className="text-xl font-semibold mb-2">Formação</h3>
            <p className="text-foreground/70">
              Formada em Arquitetura e Urbanismo, Fran ampliou seu campo de
              atuação para o estudo das relações humanas com seus ambientes.
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
              Com formação em Neuropsicologia do Desenvolvimento,
              Psicopedagogia, Monitoria de Museus (MAC-USP) e estudos sobre
              modos de vida saudáveis.
            </p>
          </div>
        </div>
      </section>

      {/* ================= VISÃO DE BEM-ESTAR ================= */}
      <section className="grid md:grid-cols-2 gap-12 items-center">
        <div className="flex flex-col gap-4">
          <h2 className="text-3xl font-bold">Visão de bem-estar</h2>

          <p className="text-foreground/70 leading-relaxed">
            O trabalho de Fran surge da vivência profissional com pessoas e
            grupos ao longo de muitos anos.
          </p>

          <p className="text-foreground/70 leading-relaxed">
            Para ela, o bem-estar não é um ideal distante, mas um objetivo
            possível, perseguido diariamente por meio de escolhas conscientes,
            relações significativas e uma vida com sentido.
          </p>
        </div>

        <div className="aspect-video bg-surface-muted rounded-xl flex items-center justify-center text-foreground/50">
          {/* Imagem */}
          <div className="flex justify-center">
            <Image
              src="/images/livro1.jpeg"
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
          <h2 className="text-3xl font-bold">
            Arquitetura Viva do Autocuidado
          </h2>
          <p className="text-foreground/70"></p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="rounded-xl bg-surface-muted p-6">
            <p className="text-foreground/70 leading-relaxed">
              O livro <strong>Arquitetura Viva do Autocuidado</strong> propoe
              que o bem-estar é uma construção consciente. Um processo onde
              corpo, emoções, mente e propósito se integram com disciplina e
              método ao cotidiano.
            </p>
          </div>

          <div className="rounded-xl bg-surface-muted p-6">
            <p className="text-foreground/70 leading-relaxed">
              Aqui o leitor passa a entender autocuidado não só como prática de
              vida mas também como fonte principal da sua evolução.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/livro"
              className="bg-[#DF633F] text-white px-6 py-3 rounded-md font-medium hover:bg-brand/90 transition-colors"
            >
              Conhecer o Livro
            </Link>

            <Link
              href="/"
              className="border border-border px-6 py-3 rounded-md font-medium hover:bg-surface-muted transition-colors"
            >
              Ver o Método
            </Link>
          </div>
        </div>
      </section>

      {/* ================= CTA FINAL ================= */}
      <section className="rounded-2xl border border-border bg-surface p-10 flex flex-col gap-6">
        <h2 className="text-3xl font-bold">
          Conheça outras iniciativas da Fran
        </h2>

        <p className="text-foreground/70 max-w-2xl">
          Fran também atua na disponibilização sob-medida de plataformas empresariais de benefícios e no desenvolvimento de dinâmicas de transformação pessoal e grupal, como o Jogo da Transformação. Confira abaixo!
        </p>
        <div className="flex flex-wrap gap-6">
          <Link
            href="https://beneshop.site"
            aria-label="Abrir página do livro: Plataformas para Corpo, Mente e Bolso"
            className="
      group relative w-[360px] overflow-hidden rounded-2xl
      border border-[#030870]/10 bg-white shadow-sm
      transition-all duration-300
      hover:-translate-y-1 hover:shadow-xl hover:shadow-[#030870]/10
      focus:outline-none focus:ring-2 focus:ring-[#019499]/40
    "
          >
            <Image
              src="/images/beneshopsite.png"
              alt="Plataformas para Corpo, Mente e Bolso"
              width={360}
              height={360}
              className="
        h-[360px] w-[360px] object-cover
        transition-transform duration-500
        group-hover:scale-[1.03]
      "
              priority
            />

            {/* Overlay suave para leitura do texto */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

            {/* Badge */}
            <span
              className="
        absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-semibold
        bg-[#019499] text-white shadow-sm
      "
            >
              Destaque
            </span>

            {/* Texto sobre a imagem */}
            <div className="absolute inset-x-0 bottom-0 p-4">
              <p className="text-white text-base font-bold leading-snug drop-shadow">
                Plataformas para Corpo, Mente e Bolso
              </p>
              <p className="mt-1 text-white/85 text-sm">Ver detalhes →</p>
            </div>
          </Link>

          <Link
            href="/contato"
            aria-label="Abrir página do livro: Jogo da Transformação"
            className="
      group relative w-[360px] overflow-hidden rounded-2xl
      border border-[#030870]/10 bg-white shadow-sm
      transition-all duration-300
      hover:-translate-y-1 hover:shadow-xl hover:shadow-[#6126E2]/15
      focus:outline-none focus:ring-2 focus:ring-[#019499]/40
    "
          >
            <Image
              src="/images/transformacao.png"
              alt="Jogo da Transformação"
              width={360}
              height={360}
              className="
        h-[360px] w-[360px] object-cover
        transition-transform duration-500
        group-hover:scale-[1.03]
      "
              priority
            />

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

            <span
              className="
        absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-semibold
        bg-[#6126E2] text-white shadow-sm
      "
            >
              Novo
            </span>

            <div className="absolute inset-x-0 bottom-0 p-4">
              <p className="text-white text-base font-bold leading-snug drop-shadow">
                Jogo da Transformação
              </p>
              <p className="mt-1 text-white/85 text-sm">Ver detalhes →</p>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
