import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "O Livro alma4D — Base conceitual do método",
  description:
    "O livro alma4D apresenta os fundamentos conceituais que estruturam todo o método e sustentam o aplicativo.",
  keywords: [
    "alma4D",
    "método alma4D",
    "livro alma4D",
    "conhecimento e tecnologia",
    "método conceitual",
  ],
  openGraph: {
    title: "O Livro alma4D",
    description:
      "A base conceitual de todo o método alma4D, integrando pensamento e prática.",
    type: "website",
  },
};
export default function LivroPage() {
  // Troque pelo ASIN real quando tiver:
  const amazonUrl = "https://www.amazon.com.br/dp/ASIN";

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

          {/* Badge oficial Amazon (Available at Amazon) */}
          <div className="pt-2">
            <a
              href={amazonUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Comprar o livro na Amazon"
              className="inline-block"
            >
              <Image
                src="/badges/available_at_amazon_br_vertical.png"
                alt="Available at Amazon"
                width={200}
                height={60}
                priority
              />
            </a>

            <p className="text-xs text-foreground/50 mt-2">
              Link direciona para a página do livro na Amazon.
            </p>
          </div>
        </div>

        <div className="aspect-3/4 bg-surface-muted rounded-xl flex items-center justify-center text-foreground/50">
          <div className="aspect-3/4 rounded-xl overflow-hidden border border-border bg-black">
            <video
              src="../assets/videos/carousel_video1.mp4"
              controls
              preload="metadata"
              className="w-full h-full object-cover"
              aria-label="Apresentação do autor do livro alma4D"
            />
          </div>
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
