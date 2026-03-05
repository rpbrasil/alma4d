import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-24">
      {/* ================= HERO ================= */}
      <section className="grid lg:grid-cols-2 gap-12 items-center">
        {/* Texto */}
        <div className="flex flex-col gap-6">
          <h1 className="text-4xl sm:text-5xl font-bold text-brand">alma4D</h1>

          <p className="text-xl text-foreground/80 leading-relaxed">
            Um método vivo que une <strong>conhecimento</strong> e{" "}
            <strong>tecnologia</strong>.
          </p>

          <p className="text-foreground/70 leading-relaxed">
            O livro estrutura o pensamento. <br />O aplicativo transforma esse
            conteúdo em prática contínua.
          </p>

          <div className="flex flex-wrap gap-4 pt-4">
            <Link
              href="/metodo"
              className="inline-flex items-center justify-center rounded-md bg-brand px-6 py-3 text-white font-semibold hover:bg-brand/90 transition-colors"
            >
              Conhecer o Método
            </Link>

            <Link
              href="/download"
              className="inline-flex items-center justify-center rounded-md border border-border px-6 py-3 font-semibold hover:bg-surface-muted transition-colors"
            >
              Baixar o App
            </Link>
          </div>
        </div>

        {/* Mídia */}
        <div className="aspect-video rounded-xl bg-surface-muted flex items-center justify-center text-foreground/50">
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Image
              src="/images/sinergia_a4D2.png"
              alt="alma4D"
              width={400}
              height={400}
              sizes="(max-width: 640px) 120px, (max-width: 768px) 140px, (max-width: 1024px) 170px, 220px"
              className="object-contain"
              priority
            />
          </Link>
        </div>
      </section>

      {/* ================= DOIS PILARES ================= */}
      <section className="grid md:grid-cols-2 gap-8">
        {/* Livro */}
        <div className="rounded-xl border border-border bg-surface p-8 flex flex-col gap-4">
          <h2 className="text-2xl font-semibold">📘 O Livro</h2>

          <p className="text-foreground/70 leading-relaxed">
            O livro apresenta os conceitos, a lógica e a visão que sustentam
            toda a modelagem do sistema alma4D.
          </p>

          <p className="text-foreground/70">
            É onde o método nasce, ganha forma e profundidade.
          </p>

          <Link
            href="/livro"
            className="mt-auto text-brand font-semibold hover:underline"
          >
            Explorar o Livro →
          </Link>
        </div>

        {/* Aplicativo */}
        <div className="rounded-xl border border-border bg-surface p-8 flex flex-col gap-4">
          <h2 className="text-2xl font-semibold">📱 O Aplicativo</h2>

          <p className="text-foreground/70 leading-relaxed">
            O aplicativo transforma o conteúdo do livro em experiência prática,
            acessível e contínua.
          </p>

          <p className="text-foreground/70">
            É onde o método se torna vivo, interativo e aplicado no dia a dia.
          </p>

          <Link
            href="/app"
            className="mt-auto text-brand font-semibold hover:underline"
          >
            Ver o Aplicativo →
          </Link>
        </div>
      </section>

      {/* ================= COMO SE CONECTAM ================= */}
      <section className="flex flex-col gap-12">
        <div className="text-center max-w-3xl mx-auto flex flex-col gap-4">
          <h2 className="text-3xl font-bold">
            Um único método, duas expressões
          </h2>
          <p className="text-foreground/70">
            O alma4D não separa teoria e prática — ele integra.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="rounded-xl bg-surface-muted p-6 text-center flex flex-col gap-3">
            <h3 className="text-xl font-semibold">1. Compreensão</h3>
            <p className="text-foreground/70">
              O livro organiza os conceitos, princípios e fundamentos.
            </p>
          </div>

          <div className="rounded-xl bg-surface-muted p-6 text-center flex flex-col gap-3">
            <h3 className="text-xl font-semibold">2. Aplicação</h3>
            <p className="text-foreground/70">
              O aplicativo traduz o conteúdo em prática concreta.
            </p>
          </div>

          <div className="rounded-xl bg-surface-muted p-6 text-center flex flex-col gap-3">
            <h3 className="text-xl font-semibold">3. Evolução contínua</h3>
            <p className="text-foreground/70">
              O uso integrado permite aprendizado vivo e progressivo.
            </p>
          </div>
        </div>

        <div className="text-center">
          <Link
            href="/metodo"
            className="inline-flex items-center justify-center rounded-md bg-brand-secondary px-6 py-3 text-white font-semibold hover:bg-brand-secondary/90 transition-colors"
          >
            Ver o Método Completo
          </Link>
        </div>
      </section>

      {/* ================= OFERTA CONJUNTA ================= */}
      <section className="rounded-2xl border border-border bg-surface p-10 flex flex-col gap-8">
        <div className="text-center max-w-3xl mx-auto flex flex-col gap-4">
          <h2 className="text-3xl font-bold">
            A experiência completa do alma4D
          </h2>
          <p className="text-foreground/70">
            Para quem deseja compreender profundamente e aplicar com
            consistência.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Visual */}
          <div className="aspect-video rounded-xl bg-surface-muted flex items-center justify-center text-foreground/50">
            <Link
              href="/"
              className="flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              <Image
                src="/images/olhoClinicoVerticalPad.jpeg"
                alt="alma4D"
                width={400}
                height={400}
                sizes="(max-width: 640px) 120px, (max-width: 768px) 140px, (max-width: 1024px) 170px, 220px"
                className="object-contain"
                priority
              />
            </Link>
          </div>

          {/* Texto */}
          <div className="flex flex-col gap-4">
            <ul className="space-y-3 text-foreground/70">
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-white text-sm">
                  ✓
                </span>
                <span>Fundamentos conceituais claros</span>
              </li>

              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-white text-sm">
                  ✓
                </span>
                <span>Aplicação prática orientada</span>
              </li>

              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-white text-sm">
                  ✓
                </span>
                <span>Um único método, sem fragmentação</span>
              </li>
            </ul>

            <Link
              href="/oferta"
              className="inline-flex items-center justify-center rounded-md bg-brand-accent px-6 py-3 text-white font-semibold hover:bg-brand-accent/90 transition-colors mt-4"
            >
              Ver Oferta Livro + App
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
