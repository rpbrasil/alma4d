import Link from "next/link";
import Image from "next/image";

export default function AppPage() {
  return (
    <div className="flex flex-col gap-24">
      {/* ================= HERO ================= */}
      <section className="grid lg:grid-cols-2 gap-12 items-center">
        {/* Texto */}
        <div className="flex flex-col gap-6 max-w-3xl">
          <h1 className="text-4xl sm:text-5xl font-bold text-brand">
            O Aplicativo alma4D
          </h1>

          <p className="text-xl text-foreground/80 leading-relaxed">
            O aplicativo é a manifestação prática do método alma4D.
          </p>

          <p className="text-foreground/70 leading-relaxed">
            Ele não existe isoladamente. Seu funcionamento, lógica e
            funcionalidades nascem diretamente do conteúdo do livro.
          </p>

          <div className="flex flex-wrap gap-4 pt-4">
            <Link
              href="/download"
              className="bg-brand text-white px-6 py-3 rounded-md font-medium hover:bg-brand/90 transition-colors"
            >
              Baixar o App
            </Link>

            <Link
              href="/livro"
              className="border border-border px-6 py-3 rounded-md font-medium hover:bg-surface-muted transition-colors"
            >
              Conhecer o Livro
            </Link>
          </div>
        </div>

        {/* Mockup / vídeo */}
        <div className="aspect-video rounded-xl bg-surface-muted flex items-center justify-center text-foreground/50">
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Image
              src="/images/pdfReader.jpeg"
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

      {/* ================= O QUE O APP FAZ ================= */}
      <section className="flex flex-col gap-12">
        <div className="max-w-3xl flex flex-col gap-4">
          <h2 className="text-3xl font-bold">O que o aplicativo faz</h2>
          <p className="text-foreground/70">
            O aplicativo traduz os conceitos do livro em uma experiência
            prática, acessível e contínua.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="rounded-xl bg-surface-muted p-6">
            <h3 className="text-xl font-semibold mb-2">Aplicação prática</h3>
            <p className="text-foreground/70">
              Permite colocar em prática os conceitos apresentados no livro.
            </p>
          </div>

          <div className="rounded-xl bg-surface-muted p-6">
            <h3 className="text-xl font-semibold mb-2">Continuidade</h3>
            <p className="text-foreground/70">
              Mantém o método vivo no cotidiano, além da leitura pontual.
            </p>
          </div>

          <div className="rounded-xl bg-surface-muted p-6">
            <h3 className="text-xl font-semibold mb-2">Integração</h3>
            <p className="text-foreground/70">
              Conecta diferentes aspectos do método em um único sistema.
            </p>
          </div>
        </div>
      </section>

      {/* ================= GALERIA / VÍDEO ================= */}
      <section className="flex flex-col gap-12">
        <div className="max-w-3xl flex flex-col gap-4">
          <h2 className="text-3xl font-bold">Visual e experiência</h2>
          <p className="text-foreground/70">
            O aplicativo foi desenhado para ser claro, funcional e coerente com
            o método que o sustenta.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="aspect-video bg-surface-muted rounded-xl flex items-center justify-center text-foreground/50">
            Tela / fluxo do aplicativo
          </div>

          <div className="aspect-video bg-surface-muted rounded-xl flex items-center justify-center text-foreground/50">
            Vídeo explicativo ou walkthrough
          </div>
        </div>
      </section>

      {/* ================= CONEXÃO COM O MÉTODO ================= */}
      <section className="grid md:grid-cols-2 gap-12 items-center">
        <div className="flex flex-col gap-4">
          <h2 className="text-3xl font-bold">O aplicativo dentro do método</h2>

          <p className="text-foreground/70 leading-relaxed">
            O aplicativo não substitui o livro e não simplifica o método. Ele o
            operacionaliza.
          </p>

          <p className="text-foreground/70">
            Para compreender o sentido completo do aplicativo, é fundamental
            conhecer o método e sua base conceitual.
          </p>

          <Link
            href="/metodo"
            className="text-brand font-medium hover:underline w-fit"
          >
            Ver o Método →
          </Link>
        </div>

        <div className="aspect-video bg-surface-muted rounded-xl flex items-center justify-center text-foreground/50">
          Diagrama livro → método → aplicativo
        </div>
      </section>

      {/* ================= CTA FINAL ================= */}
      <section className="rounded-2xl border border-border bg-surface p-10 flex flex-col gap-6">
        <h2 className="text-3xl font-bold">A experiência completa do alma4D</h2>

        <p className="text-foreground/70 max-w-2xl">
          O aplicativo alcança seu potencial máximo quando utilizado em conjunto
          com o livro que fundamenta o método.
        </p>

        <div className="flex flex-wrap gap-4">
          <Link
            href="/oferta"
            className="bg-brand text-white px-6 py-3 rounded-md font-medium hover:bg-brand/90 transition-colors"
          >
            Livro + App
          </Link>

          <Link
            href="/download"
            className="border border-border px-6 py-3 rounded-md font-medium hover:bg-surface-muted transition-colors"
          >
            Baixar o App
          </Link>
        </div>
      </section>
    </div>
  );
}
