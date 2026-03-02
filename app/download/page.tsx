import Link from "next/link";
import Image from "next/image";

export default function DownloadPage() {
   const amazonUrl = "https://www.amazon.com.br/dp/ASIN";
  return (
    <section className="max-w-3xl mx-auto flex flex-col gap-8 py-16">
      <h1 className="text-4xl font-bold text-brand">Baixar o aplicativo e o livro</h1>

      <p className="text-foreground/70">
        Escolha sua plataforma preferida para acessar o aplicativo alma4D.
      </p>

      <div className="flex flex-col sm:flex-row gap-6 items-start">
        {/* App Store */}
        <a
          href="https://apps.apple.com/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Baixar na App Store"
        >
          <Image
            src="/badges/appleBadge.svg"
            alt="Download on the App Store"
            width={180}
            height={60}
            priority
          />
        </a>

        {/* Google Play */}
        <a
          href="https://play.google.com/store"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Disponível no Google Play"
        >
          <Image
            src="/badges/googleBadge.svg"
            alt="Get it on Google Play"
            width={180}
            height={60}
          />
        </a>
      </div>

      <p className="text-foreground/70">
        Escolha sua plataforma preferida para acessar o livro alma4D na Amazon.
      </p>
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

      <p className="text-sm text-foreground/50">
        O aplicativo foi desenvolvido como extensão prática do método
        apresentado no livro.
      </p>

      <div className="pt-6">
        <Link
          href="/oferta"
          className="inline-flex items-center justify-center rounded-md bg-brand px-6 py-3 text-white font-semibold hover:bg-brand/90 transition-colors"
        >
          Conhecer a experiência completa
        </Link>
      </div>
    </section>
  );
}
