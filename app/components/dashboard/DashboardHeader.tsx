"use client";

import { useAuth } from "@/context/auth";
import { LogOut, Settings, User } from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { PAGE_TITLES } from "@/lib/pageTitles";

export default function DashboardHeader() {
  const { user, role, signOut, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // ✅ listener só após mount (não altera HTML inicial)
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await signOut();
    router.push("/");
  };

  // ✅ título resolvido de forma estável
  const title = useMemo(() => {
    if (!pathname) return "Painel";

    return (
      PAGE_TITLES[pathname] ??
      PAGE_TITLES[
        Object.keys(PAGE_TITLES).find((p) => pathname.startsWith(p)) ?? ""
      ] ??
      "Painel"
    );
  }, [pathname]);

  // ✅ placeholders ESTÁVEIS (server === client)
  const avatarChar =
    !loading && user?.email ? user.email.charAt(0).toUpperCase() : "?";

  const username =
    !loading && user?.email ? user.email.split("@")[0] : "Usuário";

  return (
    <header suppressHydrationWarning className="bg-white border-b border-border sticky top-0 z-30">
      <div className="h-14 px-6 flex items-center justify-between">
        {/* Título dinâmico */}
        <h1 className="text-base sm:text-lg font-semibold text-foreground">
          {title}
        </h1>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-3 px-3 py-1.5 rounded-md
                       hover:bg-surface-muted transition-colors"
          >
            <div
              className="w-8 h-8 rounded-full bg-surface-muted
                            flex items-center justify-center
                            text-sm font-semibold text-foreground"
            >
              {avatarChar}
            </div>

            <div className="hidden sm:flex flex-col text-left">
              <span className="text-sm font-medium leading-none">
                {username}
              </span>

              {!loading && role && (
                <span className="text-xs text-foreground/60 capitalize">
                  {role}
                </span>
              )}
            </div>
          </button>

          {open && !loading && (
            <div
              className="absolute right-0 mt-2 w-52 bg-white rounded-md
                            shadow-lg border border-border py-1 text-sm z-50"
            >
              <Link
                href="/dashboard/perfil"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-4 py-2 hover:bg-surface-muted"
              >
                <User size={16} />
                Meu perfil
              </Link>

              <Link
                href="/dashboard/configuracoes"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-4 py-2 hover:bg-surface-muted"
              >
                <Settings size={16} />
                Configurações
              </Link>

              <div className="my-1 border-t border-border" />

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2
                           text-red-600 hover:bg-red-50"
              >
                <LogOut size={16} />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
