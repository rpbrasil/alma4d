import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Linha principal */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Marca / Copyright */}
          <div className="text-sm text-foreground/70">
            <span className="font-medium text-foreground">alma4D</span>
            <span className="mx-1">·</span>
            <span>
              © {new Date().getFullYear()} Todos os direitos reservados
            </span>
          </div>

          {/* Links legais */}
          <nav className="flex gap-6 text-sm">
            <Link
              href="/termos"
              className="text-foreground/60 hover:text-foreground transition-colors"
            >
              Termos de Uso
            </Link>

            <Link
              href="/privacidade"
              className="text-foreground/60 hover:text-foreground transition-colors"
            >
              Privacidade
            </Link>
          </nav>
        </div>
        <div className="mt-6 border-t border-border pt-4 text-xs text-foreground/50">
          Construído com propósito · Voss Tecnologia · Brasil
        </div>
      </div>
    </footer>
  );
}
