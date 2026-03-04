"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { usePathname } from "next/navigation";

function NavLink({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      onClick={onClick}
      className={[
        "text-sm font-medium transition-colors",
        active ? "text-brand" : "hover:text-brand",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/90 backdrop-blur">
      <div className="max-w-5xl mx-auto px-6 py-1 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 hover:opacity-90 transition-opacity"
          onClick={() => setOpen(false)}
        >
          <Image
            src="/images/alma4D_bicolor_nobground_256.png"
            alt="alma4D"
            width={100}
            height={100}
            sizes="(max-width: 640px) 120px, (max-width: 768px) 140px, (max-width: 1024px) 170px, 220px"
            className="object-contain"
            priority
          />
        </Link>

        {/* Desktop navigation */}
        <nav
          className="hidden md:flex items-center gap-6"
          aria-label="Navegação principal"
        >
          <NavLink href="/">Início</NavLink>
          <NavLink href="/metodo">Método</NavLink>
          <NavLink href="/livro">Livro</NavLink>
          <NavLink href="/app">Aplicativo</NavLink>

          {/* ✅ NOVO ITEM */}
          <NavLink href="/autora">Autora</NavLink>

          {/* Se quiser reativar depois */}
          {/*
          <NavLink href="/oferta">Oferta</NavLink>
          */}

          <Link
            href="/download"
            className="inline-flex items-center justify-center rounded-md bg-brand px-4 py-1.5 text-white text-sm font-semibold hover:bg-brand/90 transition-colors"
          >
            Download
          </Link>

          <ThemeToggle />
        </nav>

        {/* Mobile actions */}
        <div className="md:hidden flex items-center gap-3">
          <ThemeToggle />

          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Abrir menu"
            aria-expanded={open}
            aria-controls="mobile-nav"
            className="inline-flex items-center justify-center rounded-md border border-border p-2 hover:bg-surface-muted transition-colors"
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div
          className="md:hidden border-t border-border bg-surface"
          id="mobile-nav"
        >
          <nav
            className="flex flex-col px-6 py-4 gap-4"
            aria-label="Navegação mobile"
          >
            <NavLink href="/" onClick={() => setOpen(false)}>
              Início
            </NavLink>
            <NavLink href="/metodo" onClick={() => setOpen(false)}>
              Método
            </NavLink>
            <NavLink href="/livro" onClick={() => setOpen(false)}>
              Livro
            </NavLink>
            <NavLink href="/app" onClick={() => setOpen(false)}>
              Aplicativo
            </NavLink>

            {/* ✅ NOVO ITEM */}
            <NavLink href="/autora" onClick={() => setOpen(false)}>
              Autora
            </NavLink>

            {/* Se quiser reativar depois */}
            {/*
            <NavLink href="/oferta" onClick={() => setOpen(false)}>
              Oferta
            </NavLink>
            */}

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
