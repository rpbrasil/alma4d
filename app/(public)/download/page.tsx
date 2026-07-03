import Link from "next/link";
import Image from "next/image";

export default function DownloadPage() {
  const amazonUrl = "https://www.amazon.com.br/dp/B0H3864R5C";
  return (
    <section className="flex flex-col gap-8 py-16 text-center md:text-left items-center md:items-start">
      <h1 className="text-4xl font-bold text-brand">
        Baixar o aplicativo e o livro
      </h1>

      <p className="text-foreground/70">
        O aplicativo alma4D está disponível somente para clientes
        cadastrados.{" "}
      </p>
      <p className="text-foreground/70">
        Se sua empresa já é cliente, acesse o item{" "}
        <Link href="/login" className="text-brand-secondary underline">
          Clientes
        </Link>{" "}
        no link do menu de navegação.
      </p>

      <div className="flex flex-wrap gap-4 items-stretch justify-center md:justify-start">
        {/* App Store */}
        {/* <Link href="/lancamento" aria-label="Baixar na App Store">
          <Image
            src="/badges/appleBadge.svg"
            alt="Download on the App Store"
            width={180}
            height={60}
            priority
          />
        </Link> */}

        {/* Google Play */}
        {/* <Link href="/lancamento" aria-label="Disponível no Google Play">
          <Image
            src="/badges/googleBadge.svg"
            alt="Get it on Google Play"
            width={180}
            height={60}
          />
        </Link> */}

        {/* iOS */}
        <Link
          href="/contato"
          aria-label="Disponível em breve para iOS"
          className="flex flex-col items-center gap-2 rounded-xl border border-foreground/20 w-36 px-4 py-4 hover:border-brand hover:bg-brand/5 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-10 h-10 text-foreground/80"
            aria-hidden="true"
          >
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
          </svg>
          <div className="h-10 flex items-center justify-center">
            <span className="text-sm font-medium text-foreground/70 text-center leading-tight">
              iOS
            </span>
          </div>
        </Link>

        {/* Android */}
        <Link
          href="/contato"
          aria-label="Disponível em breve para Android"
          className="flex flex-col items-center gap-2 rounded-xl border border-foreground/20 w-36 px-4 py-4 hover:border-brand hover:bg-brand/5 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-10 h-10 text-foreground/80"
            aria-hidden="true"
          >
            <path d="M17.523 15.341a.81.81 0 0 1-.812.812.81.81 0 0 1-.812-.812V9.865a.81.81 0 0 1 .812-.812.81.81 0 0 1 .812.812v5.476zm-10.234 0a.81.81 0 0 1-.812.812.81.81 0 0 1-.812-.812V9.865a.81.81 0 0 1 .812-.812.81.81 0 0 1 .812.812v5.476zM6.376 7.004l.96-1.76a.2.2 0 0 0-.073-.272.2.2 0 0 0-.273.073l-.974 1.785A6.3 6.3 0 0 0 3.5 9.574h17a6.3 6.3 0 0 0-2.516-2.744l-.974-1.785a.2.2 0 0 0-.273-.073.2.2 0 0 0-.073.272l.96 1.76A5.78 5.78 0 0 0 15.25 6.7a5.78 5.78 0 0 0-6.5 0 5.78 5.78 0 0 0-2.374.304zM9.5 4.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5zm5 0a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5zM3.5 10.324v6.613c0 .9.726 1.625 1.625 1.625h.875v2.626a.81.81 0 0 0 .812.812.81.81 0 0 0 .813-.812v-2.626h4.75v2.626a.81.81 0 0 0 .812.812.81.81 0 0 0 .813-.812v-2.626h.875c.9 0 1.625-.726 1.625-1.625v-6.613H3.5z" />
          </svg>
          <div className="h-10 flex items-center justify-center">
            <span className="text-sm font-medium text-foreground/70 text-center leading-tight">
              Android
            </span>
          </div>
        </Link>

        {/* NR1 */}
        <Link
          href="/nr1/resolva-agora"
          aria-label="NR1 - Riscos Psicossociais"
          className="flex flex-col items-center gap-2 rounded-xl border border-foreground/20 w-36 px-4 py-4 hover:border-brand hover:bg-brand/5 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-10 h-10 text-foreground/80"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5z"
              clipRule="evenodd"
            />
          </svg>
          <div className="h-10 flex items-center justify-center">
            <span className="text-sm font-medium text-foreground/70 text-center leading-tight">
              NR1 - Riscos
              <br />
              Psicossociais
            </span>
          </div>
        </Link>
      </div>

      <p className="text-foreground/70">
        Clique no ícone abaixo para acessar o livro Arquitetura Viva na Amazon.
      </p>
      <div className="pt-2">
        <Link
          href={amazonUrl}
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
        </Link>
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
          href="/autora"
          className="inline-flex items-center justify-center rounded-md bg-brand px-6 py-3 text-white font-semibold hover:bg-brand/90 transition-colors"
        >
          Sobre a autora
        </Link>
      </div>
    </section>
  );
}
