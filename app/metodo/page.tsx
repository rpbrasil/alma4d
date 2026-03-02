import Link from "next/link";

export default function MetodoPage() {
  return (
    <div className="flex flex-col gap-24">
      {/* HERO */}
      <section className="flex flex-col gap-8 max-w-3xl">
        <h1 className="text-4xl sm:text-5xl font-bold text-brand">
          O Método alma4D
        </h1>

        <p className="text-xl text-foreground/80">
          Um método integrado que une compreensão conceitual e aplicação
          prática.
        </p>

        <p className="text-foreground/70">
          Ele nasce no livro e se manifesta no aplicativo como um sistema vivo.
        </p>
      </section>

      {/* DIAGRAMA */}
      <section className="grid md:grid-cols-3 gap-8">
        <div className="rounded-xl border border-border bg-surface p-6 text-center">
          <h3 className="text-xl font-semibold">📘 Livro</h3>
          <p className="text-foreground/70">
            Fundamentos e estrutura conceitual.
          </p>
        </div>

        <div className="rounded-xl bg-brand text-white p-8 text-center">
          <h3 className="text-2xl font-semibold">Método alma4D</h3>
          <p className="text-white/90">Eixo que conecta teoria e prática.</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6 text-center">
          <h3 className="text-xl font-semibold">📱 Aplicativo</h3>
          <p className="text-foreground/70">
            Aplicação prática e experiência contínua.
          </p>
        </div>
      </section>

      {/* FLUXO */}
      <section className="grid md:grid-cols-3 gap-8">
        <div className="bg-surface-muted p-6 rounded-xl">
          <h3 className="font-semibold text-xl">1. Compreender</h3>
          <p className="text-foreground/70">
            O livro apresenta os fundamentos do método.
          </p>
        </div>

        <div className="bg-surface-muted p-6 rounded-xl">
          <h3 className="font-semibold text-xl">2. Aplicar</h3>
          <p className="text-foreground/70">
            O aplicativo traduz o conteúdo em prática.
          </p>
        </div>

        <div className="bg-surface-muted p-6 rounded-xl">
          <h3 className="font-semibold text-xl">3. Evoluir</h3>
          <p className="text-foreground/70">
            A integração gera aprendizado contínuo.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-surface border border-border rounded-2xl p-10">
        <h2 className="text-3xl font-bold mb-4">Conheça o método completo</h2>

        <div className="flex gap-4 flex-wrap">
          <Link
            href="/livro"
            className="text-brand font-medium hover:underline"
          >
            Explorar o Livro
          </Link>

          <Link href="/app" className="text-brand font-medium hover:underline">
            Ver o Aplicativo
          </Link>
        </div>
      </section>
    </div>
  );
}
