import Link from "next/link";

export default function LivroPage() {
  return (
    <div className="flex flex-col gap-24">
      {/* HERO */}
      <section className="grid lg:grid-cols-2 gap-12 items-center">
        <div className="flex flex-col gap-6">
          <h1 className="text-4xl sm:text-5xl font-bold text-brand">
            O Livro alma4D
          </h1>

          <p className="text-xl text-foreground/80">
            A base conceitual de todo o método.
          </p>

          <p className="text-foreground/70">
            O livro estrutura os princípios e a lógica que sustentam o
            aplicativo.
          </p>

          <div className="flex gap-4 flex-wrap">
            <Link
              href="/metodo"
              className="text-brand font-medium hover:underline"
            >
              Ver o Método
            </Link>

            <Link
              href="/oferta"
              className="text-brand font-medium hover:underline"
            >
              Livro + App
            </Link>
          </div>
        </div>

        <div className="aspect-3/4 bg-surface-muted rounded-xl flex items-center justify-center 
        text-foreground/50">
          Capa do livro / vídeo do autor
        </div>
      </section>

      {/* CONTEÚDO */}
      <section className="grid md:grid-cols-3 gap-8">
        <div className="bg-surface-muted p-6 rounded-xl">
          <h3 className="text-xl font-semibold">Fundamentos</h3>
          <p className="text-foreground/70">
            Princípios estruturantes do método.
          </p>
        </div>

        <div className="bg-surface-muted p-6 rounded-xl">
          <h3 className="text-xl font-semibold">Modelagem</h3>
          <p className="text-foreground/70">Organização lógica e conceitual.</p>
        </div>

        <div className="bg-surface-muted p-6 rounded-xl">
          <h3 className="text-xl font-semibold">Visão integrada</h3>
          <p className="text-foreground/70">
            Teoria e prática sem fragmentação.
          </p>
        </div>
      </section>

      {/* RELAÇÃO COM APP */}
      <section className="bg-surface border border-border rounded-2xl p-10">
        <h2 className="text-3xl font-bold mb-4">Livro e Aplicativo</h2>

        <p className="text-foreground/70 mb-6">
          O livro fundamenta. O aplicativo operacionaliza.
        </p>

        <Link href="/app" className="text-brand font-medium hover:underline">
          Ver o Aplicativo
        </Link>
      </section>
    </div>
  );
}
