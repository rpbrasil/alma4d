"use client";

import Link from "next/link";
import { useState } from "react";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/90 backdrop-blur">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="text-xl font-bold text-brand hover:opacity-90 transition-opacity"
        >
          alma4D
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-sm font-medium hover:text-brand">
            Início
          </Link>

          <Link href="/metodo" className="text-sm font-medium hover:text-brand">
            Método
          </Link>

          <Link href="/livro" className="text-sm font-medium hover:text-brand">
            Livro
          </Link>

          <Link href="/app" className="text-sm font-medium hover:text-brand">
            Aplicativo
          </Link>

          <Link href="/oferta" className="text-sm font-medium hover:text-brand">
            Oferta
          </Link>

          <Link
            href="/download"
            className="inline-flex items-center justify-center rounded-md bg-brand px-4 py-2 text-white text-sm font-semibold hover:bg-brand/90 transition-colors"
          >
            Download
          </Link>

          <ThemeToggle />
        </nav>

        {/* Mobile actions */}
        <div className="md:hidden flex items-center gap-3">
          <ThemeToggle />

          <button
            onClick={() => setOpen(!open)}
            aria-label="Abrir menu"
            className="inline-flex items-center justify-center rounded-md border border-border p-2 hover:bg-surface-muted transition-colors"
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-border bg-surface">
          <nav className="flex flex-col px-6 py-4 gap-4">
            <Link href="/" onClick={() => setOpen(false)}>
              Início
            </Link>
            <Link href="/metodo" onClick={() => setOpen(false)}>
              Método
            </Link>
            <Link href="/livro" onClick={() => setOpen(false)}>
              Livro
            </Link>
            <Link href="/app" onClick={() => setOpen(false)}>
              Aplicativo
            </Link>
            <Link href="/oferta" onClick={() => setOpen(false)}>
              Oferta
            </Link>
            <Link
              href="/download"
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex items-center justify-center rounded-md bg-brand px-4 py-2 text-white font-semibold"
            >
              Download
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
