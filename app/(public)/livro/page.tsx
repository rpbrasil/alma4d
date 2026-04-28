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
  //const amazonUrl = "https://www.amazon.com.br/dp/ASIN";

  return (
    <div className="flex flex-col gap-24">
      {/* HERO */}
      <section className="grid lg:grid-cols-2 gap-12 items-center">
        <div className="flex flex-col gap-6 text-center md:text-left items-center md:items-start">
          <h1 className="text-4xl sm:text-5xl font-bold text-brand">
            Arquitetura <span className="text-[#019499]">Viva</span> do
            Autocuidado
          </h1>

          <blockquote className="border-l-4 border-brand pl-6 py-2 italic text-xl sm:text-xl text-foreground/70 my-6">
            Viver bem deixou de ser um sonho de consumo para se tornar a métrica
            mais valiosa da atualidade.
          </blockquote>
          <p className="text-xl text-foreground/80">
            Ao dominar as 4 Dimensões expostas neste livro, você aprende a gerir
            sua própria energia vital, transformando a rotina em um ritual
            poderoso.
          </p>
          {/* IMAGEM (somente mobile) - entre os dois primeiros textos */}
          <div className="w-screen max-w-none mx-[calc(50%-50vw)] sm:w-full sm:mx-0 lg:hidden">
            <div className="relative w-full aspect-2/2 bg-surface-muted">
              <Image
                src="/images/livro3.jpeg"
                alt="livro Arquitetura Viva"
                fill
                sizes="100vw"
                className="object-contain"
                priority
              />
            </div>
          </div>
          <p className="text-foreground/70">
            Este livro é o mapa para quem busca elevar o padrão de bem-estar
            pela sensibilização da consciência física e mental. Ao longo das
            práticas você notará que o desânimo crônico, a fadiga e a falta de
            perspectiva darão lugar àquela presença vibrante da pessoa que todos
            querem ter por perto. O conhecimento aqui apresentado é a chave para
            assumir um novo estilo de viver, mais saudável e produtivo.
          </p>

          <div className="flex gap-4 flex-wrap justify-center md:justify-start text-center md:text-left">
            <Link href="/" className="text-brand font-medium hover:underline">
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
          <div className="pt-2 flex flex-col items-center md:items-start">
            <Link href="/lancamento" aria-label="Comprar o livro na Amazon" className="inline-block">
             
              <Image
                src="/badges/available_at_amazon_br_vertical.png"
                alt="Available at Amazon"
                width={200}
                height={60}
                // Aqui é onde "travava" no mobile: width fixo.
                // Mantemos a proporção, mas deixamos responsivo até um limite agradável.
                sizes="(max-width: 640px) 80vw, 200px"
                style={{ width: "min(80vw, 220px)", height: "auto" }}
                className="block"
                priority
              />
            </Link>

            <p className="text-xs text-foreground/50 mt-2">
              Link direciona para a página do livro na Amazon.
            </p>
          </div>
        </div>

        <div className="hidden lg:block w-screen max-w-none mx-[calc(50%-50vw)] sm:w-full sm:mx-0">
          <div className="relative w-full aspect-2/2 bg-surface-muted">
            <Image
              src="/images/livro3.jpeg"
              alt="livro Arquitetura Viva"
              fill
              sizes="100vw"
              className="object-contain"
              priority
            />
          </div>
        </div>
      </section>

      {/* CONTEÚDO */}
      <section className="grid md:grid-cols-3 gap-8">
        <div className="w-screen mx-[calc(50%-50vw)] sm:w-full sm:mx-0">
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
          <div className="relative w-full aspect-4/3 rounded-lg overflow-hidden">
            <Image
              src="/images/livroPad.jpeg"
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

        <div className="w-screen mx-[calc(50%-50vw)] sm:w-full sm:mx-0">
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

      <section className="bg-surface border border-border rounded-2xl p-6 sm:p-8 md:p-10 text-center md:text-left">
        <div className="mx-auto w-full max-w-2xl md:max-w-3xl">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Livro e Aplicativo
          </h2>

          <p className="text-foreground/70 mb-6">
            Seja você um entusiasta da longevidade, um líder de equipes ou um
            profissional de saúde, o convite aqui é para uma{" "}
            <b>alfabetização corporal e mental</b> completas. Não se trata de
            esperar que o ambiente melhore, mas de aplicar os princípios do
            bem-estar à vida real, colher os resultados e entender que o ser
            humano não é apenas um objeto de cuidado, e sim o campo onde a
            transformação realmente acontece.
          </p>

          <div className="flex justify-center md:justify-start">
            <Link
              href="/app"
              className="text-brand font-medium hover:underline"
            >
              Ver o Aplicativo
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
