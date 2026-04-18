import Image from "next/image";
import Link from "next/link";

export default function AutoraPage() {
  return (
    <div className="flex flex-col gap-24 overflow-x-hidden">
      {/* ================= HERO ================= */}
      <section className="grid lg:grid-cols-2 gap-12 items-center">
        {/* Texto */}
        <div className="flex flex-col gap-6 max-w-3xl">
          <h1 className="text-4xl sm:text-5xl font-bold text-brand">
            Fran Abbud
          </h1>

          <p className="text-xl text-foreground/80 leading-relaxed">
            Autora do livro <strong>Arquitetura Viva do Autocuidado</strong> e
            pesquisadora para o bem-estar integral do ser humano.
          </p>

          <p className="text-foreground/70 leading-relaxed">
            Conhecimento, sensibilidade e experiência prática, transformando
            vidas ao longo de 30 anos de trajetória.
          </p>
        </div>

        {/* Imagem */}
        <div className="relative flex justify-center w-full max-w-full overflow-hidden">
          <Image
            src="/images/fran_book_bw.jpeg"
            alt="Fran Abbud"
            width={360}
            height={360}
            className="rounded-2xl object-cover relative z-10"
            priority
          />

          {/* Linha inferior segura */}
          <div className="absolute bottom-0 inset-x-0 h-1 bg-[#DF633F]" />
        </div>
      </section>
      {/* ================= TRAJETÓRIA ================= */}
      <section className="flex flex-col gap-12">
        <div className="max-w-3xl flex flex-col gap-4">
          <h2 className="text-3xl font-bold">Trajetória</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              title: "Formação",
              text: "Formada em Arquitetura e Urbanismo, Fran ampliou seu campo de atuação para o estudo das relações humanas com seus ambientes.",
            },
            {
              title: "Experiência",
              text: "Atuou em Recursos Humanos na área da saúde e por 18 anos como Terapeuta Artística Antroposófica.",
            },
            {
              title: "Pesquisa contínua",
              text: "Formação em Neuropsicologia, Psicopedagogia, Monitoria de Museus e estudos sobre modos de vida saudáveis.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-xl bg-surface-muted p-6">
              <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
              <p className="text-foreground/70">{item.text}</p>
            </div>
          ))}
        </div>
      </section>
      {/* ================= VISÃO ================= */}
      <section className="grid md:grid-cols-2 gap-12 items-center">
        <div className="flex flex-col gap-4">
          <h2 className="text-3xl font-bold">Visão de bem-estar</h2>

          <p className="text-foreground/70 leading-relaxed">
            Para Fran, o bem-estar é construído diariamente por escolhas
            conscientes, relações significativas e vida com sentido.
          </p>
        </div>

        <div className="aspect-video rounded-xl bg-surface-muted flex items-center justify-center overflow-hidden">
          <Image
            src="/images/livro1.jpeg"
            alt="Fran Abbud"
            width={360}
            height={360}
            className="rounded-2xl object-cover"
            priority
          />
        </div>
      </section>
      {/* ================= O LIVRO ================= */}
      <section className="flex flex-col gap-12">
        <h2 className="text-3xl font-bold">Arquitetura Viva do Autocuidado</h2>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="rounded-xl bg-surface-muted p-6">
            <p className="text-foreground/70 leading-relaxed">
              O bem-estar é consequência do conjunto de práticas que integram corpo, emoções, mente e propósito à sua rotina diária.
            </p>
          </div>

          <div className="rounded-xl bg-surface-muted p-6">
            <p className="text-foreground/70 leading-relaxed">
              O autocuidado, mais do que uma postura adotada em virtude de um problema de saúde, torna-se fonte primária de evolução pessoal.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <Link
            href="/livro"
            className="bg-[#DF633F] text-white px-6 py-3 rounded-md font-medium hover:opacity-90 transition"
          >
            Conhecer o Livro
          </Link>

          <Link
            href="/"
            className="border border-border px-6 py-3 rounded-md font-medium hover:bg-surface-muted transition"
          >
            Ver o Método
          </Link>
        </div>
      </section>
      {/* ================= CTA FINAL ================= */}
      <section className="rounded-2xl border border-border bg-surface px-[5%] py-10 flex flex-col gap-6">
        <h2 className="text-3xl font-bold">Outras iniciativas</h2>

        <p className="text-foreground/70 max-w-2xl">
          Fran também atua profissionalmente em <strong>plataformas empresariais de benefícios</strong> e
          no desenvolvimento de <strong>dinâmicas para transformação de grupos</strong>, como o
          FCP - Frameworks for Change Program. Confira abaixo!
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {[
            {
              href: "https://beneshop.site",
              img: "https://alma4d.com.br/images/beneshop-logo.png",
              label: "Plataformas para Corpo, Mente e Bolso",
              badge: "Destaque",
              badgeColor: "#019499",
            },
            {
              href: "/contato",
              img: "https://alma4d.com.br/images/fcp-logo.png",
              label: "FCP - Frameworks for Change Program",
              badge: "Novo",
              badgeColor: "#6126E2",
            },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="group relative aspect-square overflow-hidden rounded-2xl border border-[#030870]/10 bg-gray-100 transition hover:-translate-y-1 hover:shadow-xl"
            >
              <Image
                src={item.img}
                alt={item.label}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                sizes="(max-width: 640px) 100vw, 50vw"
              />

              <div className="absolute inset-0 bg-linear-to-t from-black/55 via-black/10 to-transparent" />

              {/* sem  */}

              <div className="absolute bottom-0 p-4 text-white">
                <p className="font-bold">{item.label}</p>
                <p className="text-sm opacity-85">Ver detalhes →</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
