import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="max-w-5xl mx-auto px-6 py-6 text-sm text-foreground/70 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span>
          © {new Date().getFullYear()} alma4D — Todos os direitos reservados.
        </span>

        <nav className="flex gap-4">
          <Link
            href="/termos"
            className="hover:text-foreground underline underline-offset-4"
          >
            Termos de Uso
          </Link>

          <Link
            href="/privacidade"
            className="hover:text-foreground underline underline-offset-4"
          >
            Política de Privacidade
          </Link>
        </nav>
      </div>
    </footer>
  );
}
