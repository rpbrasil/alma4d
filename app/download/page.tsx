import Link from "next/link";
import Image from "next/image";

export default function DownloadPage() {
  return (
    <section className="max-w-3xl mx-auto flex flex-col gap-8 py-16">
      <h1 className="text-4xl font-bold text-brand">Baixar o aplicativo</h1>

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
