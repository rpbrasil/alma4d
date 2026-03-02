export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="max-w-5xl mx-auto px-6 py-6 text-sm text-foreground/70">
        © {new Date().getFullYear()} alma4D — Todos os direitos reservados.
      </div>
    </footer>
  );
}
