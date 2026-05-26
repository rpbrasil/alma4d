"use client";

import { useEffect, useState } from "react";
import { getStorageItem, setStorageItem } from "@/lib/storage";

function getInitialTheme(): boolean {
  // ✅ SSR/Prerender guard (no server não existe window/localStorage)
  if (typeof window === "undefined") return false; // default LIGHT

  try {
    const saved = getStorageItem("theme");
    if (saved === "dark") return true;
    if (saved === "light") return false;
  } catch {
    // Storage pode falhar (ex: modo privado / bloqueios); seguimos com fallback
  }

  // ✅ fallback: se não tem nada salvo, começa em LIGHT
  return false;
}

export function ThemeToggle() {
  // ✅ initializer seguro (não quebra no build)
  const [dark, setDark] = useState<boolean>(() => getInitialTheme());

  // ✅ sincroniza DOM + storage quando o estado mudar (sem setState aqui)
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);

    try {
      setStorageItem("theme", dark ? "dark" : "light");
    } catch {
      // ignore
    }
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
