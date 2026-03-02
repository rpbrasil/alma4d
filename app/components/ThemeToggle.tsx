"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "theme"; // "light" | "dark"

function getInitialTheme(): boolean {
  // Durante SSR não existe window/localStorage
  if (typeof window === "undefined") return false;

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "dark") return true;
  if (saved === "light") return false;

  // fallback: preferência do sistema
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeToggle() {
  const [dark, setDark] = useState<boolean>(getInitialTheme);

  // Effect apenas sincroniza "sistema externo" (DOM)
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    // se quiser, mantenha o storage sempre coerente
    localStorage.setItem(STORAGE_KEY, dark ? "dark" : "light");
  }, [dark]);

  return (
    <button
      type="button"
      onClick={() => setDark((v) => !v)}
      className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-surface-muted hover:text-foreground transition-colors"
      aria-label="Alternar tema"
    >
      <span className="text-base leading-none">{dark ? "☾" : "☀︎"}</span>
      <span>{dark ? "N" : "D"}</span>
    </button>
  );
}
