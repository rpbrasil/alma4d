"use client";

import Link from "next/link";
import Image from "next/image";
import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

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

  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      onClick={onClick}
      className={[
        "text-sm font-medium transition-colors",
        active ? "text-brand-secondary" : "hover:text-brand-secondary",
      ].join(" ")}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // ✅ Mais robusto: funciona para /download, /download/ios, /download/android...
  const isDownloadPage = pathname.startsWith("/download");

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/90 backdrop-blur">
      {/* ✅ Menos altura no mobile: px/py menores no mobile, mantém no md+ */}
      <div className="w-full px-0 py-0.5 md:max-w-5xl md:mx-auto md:px-6 md:py-1 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/metodo"
          className="flex items-center gap-2 mr-auto md:mr-0 hover:opacity-90 transition-opacity order-1 md:order-0"
          onClick={() => setOpen(false)}
          aria-label="Ir para a página inicial"
        >
          {/* Container define o tamanho da logo */}
          <div className="relative h-11 w-52 sm:w-60 md:h-14 md:w-72 lg:w-80 ml-0 sm:ml-0">
            <Image
              src="/images/alma4d-bicolor-nobground-256.png"
              alt="alma4D"
              fill
              sizes="(max-width: 640px) 208px, (max-width: 768px) 240px, (max-width: 1024px) 288px, 320px"
              className="object-contain"
              priority
            />
          </div>
        </Link>

        {/* Desktop navigation */}
        <nav
          className="hidden md:flex items-center gap-6"
          aria-label="Navegação principal"
        >
          <NavLink href="/metodo">Método</NavLink>
          <NavLink href="/livro">Livro</NavLink>
          <NavLink href="/app">Aplicativo</NavLink>
          <NavLink href="/autora">Autora</NavLink>
          <NavLink href="/contato">Contato</NavLink>

          {/* ✅ Botão Download muda para secondary quando ativo */}
          <Link
            href="/download"
            aria-current={isDownloadPage ? "page" : undefined}
            className={[
              "inline-flex items-center justify-center rounded-md px-4 py-1.5 text-sm font-semibold transition-colors",
              isDownloadPage
                ? "bg-brand-secondary text-white shadow-sm dark:bg-brand-secondary/80 dark:text-white cursor-default pointer-events-none"
                : "bg-brand text-white hover:bg-brand/90 dark:bg-brand/80 dark:hover:bg-brand/70",
            ].join(" ")}
          >
            Download
          </Link>

          <ThemeToggle />
        </nav>

        {/* Mobile actions */}
        <div className="md:hidden flex items-center gap-3 order-2">
          <ThemeToggle />

          {/* ✅ Botão mais compacto no mobile */}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            className="inline-flex items-center justify-center rounded-md border border-border px-4 py-1.5 hover:bg-surface-muted transition-colors mr-3.5"
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
            className="flex flex-col px-4 py-3 gap-4"
            aria-label="Navegação mobile"
          >
            <NavLink href="/metodo" onClick={() => setOpen(false)}>
              Método
            </NavLink>
            <NavLink href="/livro" onClick={() => setOpen(false)}>
              Livro
            </NavLink>
            <NavLink href="/app" onClick={() => setOpen(false)}>
              Aplicativo
            </NavLink>
            <NavLink href="/autora" onClick={() => setOpen(false)}>
              Autora
            </NavLink>
            <NavLink href="/contato" onClick={() => setOpen(false)}>
              Contato
            </NavLink>

            {/* ✅ Download no mobile também muda quando ativo */}
            <Link
              href="/download"
              onClick={() => setOpen(false)}
              aria-current={isDownloadPage ? "page" : undefined}
              className={[
                "mt-1 inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition-colors",
                isDownloadPage
                  ? "bg-brand-secondary text-white shadow-sm dark:bg-brand-secondary/80 dark:text-white cursor-default pointer-events-none"
                  : "bg-brand text-white hover:bg-brand/90 dark:bg-brand/80 dark:hover:bg-brand/70",
              ].join(" ")}
            >
              Download
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
