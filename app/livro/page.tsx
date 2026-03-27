import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "O Livro Arquitetura Viva — Base conceitual do método",
  description:
    "O livro Arquitetura Viva apresenta os fundamentos conceituais que estruturam todo o método e sustentam o aplicativo.",
  keywords: [
    "Arquitetura Viva",
    "método alma4D",
    "livro Arquitetura Viva",
    "conhecimento e tecnologia",
    "método conceitual",
  ],
  openGraph: {
    title: "O Livro Arquitetura Viva",
    description:
      "A base conceitual de todo o método, integrando pensamento e prática.",
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
            O Livro Arquitetura Viva
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
              href="/download"
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
                // Aqui é onde “travava” no mobile: width fixo.
                // Mantemos a proporção, mas deixamos responsivo até um limite agradável.
                sizes="(max-width: 640px) 80vw, 200px"
                style={{ width: "min(80vw, 220px)", height: "auto" }}
                className="block"
                priority
              />
            </a>

            <p className="text-xs text-foreground/50 mt-2">
              Link direciona para a página do livro na Amazon.
            </p>
          </div>
        </div>

        {/* NÃO MEXER NO VÍDEO (como você pediu) */}
        <div className="aspect-3/4 bg-surface-muted rounded-xl flex items-center justify-center text-foreground/50">
          <div className="aspect-3/4 rounded-xl overflow-hidden border border-border bg-black">
            <video
              src="/videos/carousel_video1.mp4"
              controls
              preload="metadata"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* CONTEÚDO */}
      <section className="grid md:grid-cols-3 gap-8">
        <div className="bg-surface-muted p-6 rounded-xl flex flex-col gap-4">
          {/* Imagem no topo do card */}
          <div className="relative w-full aspect-4/3 rounded-lg overflow-hidden">
            <Image
              src="/images/alma4d-quatro-quad-512.png"
              alt="Fundamentos do método alma4D"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 33vw"
              priority
            />
          </div>
          <div className="mt-6 text-center max-w-md mx-auto">
            <h3 className="text-xl font-semibold">Fundamentos</h3>
            <p className="text-foreground/70">
              Princípios estruturantes do método.
            </p>
          </div>
        </div>

        <div className="w-screen mx-[calc(50%-50vw)] sm:w-full sm:mx-0">
          <div className="relative w-full aspect-2/1 rounded-lg overflow-hidden">
            <Image
              src="/images/alma4d-metodo-1200600.png"
              alt="Visão integrada teoria e prática alma4D"
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 33vw"
              priority
            />
          </div>
          <div className="mt-6 text-center max-w-md mx-auto">
            <h3 className="text-xl font-semibold">Visão integrada</h3>
            <p className="text-foreground/70">
              Teoria e prática sem fragmentação.
            </p>
          </div>
        </div>

        <div className="bg-surface-muted p-6 rounded-xl flex flex-col gap-4">
          {/* Imagem no topo do card */}
          <div className="relative w-full aspect-4/3 rounded-lg overflow-hidden">
            <Image
              src="/images/alma4d-doze-itens-512.png"
              alt="Modelagem conceitual alma4D"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 33vw"
              priority
            />
          </div>
          <div className="mt-6 text-center max-w-md mx-auto">
            <h3 className="text-xl font-semibold">Modelagem</h3>
            <p className="text-foreground/70">
              Organização lógica e conceitual.
            </p>
          </div>
        </div>
      </section>

      {/* RELAÇÃO COM APP */}
      <section className="bg-surface border border-border rounded-2xl p-10">
        <h2 className="text-3xl font-bold mb-4">Livro e Aplicativo</h2>

        <p className="text-foreground/70 mb-6">
          O livro fundamenta. O aplicativo operacionaliza.O Aplicativo alma4D -
          surge como uma ferramenta de integração prática desse modelo. Seu
          objetivo não é substituir o cuidado profissional, nem impor protocolos
          rígidos, mas organizar, estimular e acompanhar hábitos de saúde
          integral de forma acessível, ética e consciente.
        </p>

        <Link href="/app" className="text-brand font-medium hover:underline">
          Ver o Aplicativo
        </Link>
      </section>
    </div>
  );
}
