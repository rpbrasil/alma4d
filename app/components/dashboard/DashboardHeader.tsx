"use client";

import { useAuth } from "@/context/auth";
import { LogOut, Settings, User } from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { PAGE_TITLES } from "@/lib/pageTitles";
import Image from "next/image";
import { getSupabaseClient } from "@/lib/supabase/client";
import PwaInstallButton from "@/components/PwaInstallButton";

type Props = {
  onMenuClick: () => void;
  isMenuOpen: boolean;
};
// Uso:
<Image src="/logo.png" width={500} height={500} alt="Descrição" />;

export default function DashboardHeader({ onMenuClick, isMenuOpen }: Props) {
  const { user, usuarioId, signOut, loading, plano } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [clienteNome, setClienteNome] = useState<string>("Painel Corporativo");
  const [clienteLogo, setClienteLogo] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  const basePath =
    plano === "express" ? "/dashboard/express" : "/dashboard/premium";

  // ✅ listener só após mount (não altera HTML inicial)
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    router.push("/");
  };

  // ✅ título resolvido de forma estável
  const title = useMemo(() => {
    if (!pathname) return "Painel";

    const sortedPaths = Object.keys(PAGE_TITLES).sort(
      (a, b) => b.length - a.length,
    );

    const matchedPath =
      sortedPaths.find((path) => pathname === path) ??
      sortedPaths.find((path) => pathname.startsWith(path));

    return matchedPath ? PAGE_TITLES[matchedPath] : "Painel";
  }, [pathname]);

  // ✅ placeholders ESTÁVEIS (server === client)

  useEffect(() => {
    if (loading || !usuarioId) return;

    let mounted = true;

    (async () => {
      try {
        const supabase = getSupabaseClient();

        const { data: usuario } = await supabase
          .from("usuarios")
          .select("cliente_id")
          .eq("id", usuarioId)
          .single();

        if (!usuario?.cliente_id || !mounted) return;

        const { data: cliente } = await supabase
          .from("clientes")
          .select("nome, logo_url")
          .eq("id", usuario.cliente_id)
          .single();

        if (!mounted) return;
        if (cliente?.nome) {
          setClienteNome(cliente.nome);
        } else {
          setClienteNome("Painel Corporativo");
        }
        if (cliente?.logo_url) {
          setClienteLogo(cliente.logo_url);
        } else {
          setClienteLogo(null); // força fallback
        }
      } catch {
        setClienteLogo(null);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [loading, usuarioId]);

  return (
    <header
      suppressHydrationWarning
      className="bg-white border-b border-border sticky top-0 z-30"
    >
      <div className="h-12 px-6 flex items-center justify-between">
        {/* ✅ BOTÃO HAMBURGER */}
        <div className="flex items-center gap-2">
          <button
            onClick={onMenuClick}
            className="md:hidden mr-3 p-2 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-95 transition"
            aria-label="Abrir menu"
            aria-controls="dashboard-sidebar"
            aria-expanded={isMenuOpen}
          >
            <span className="text-2xl">☰</span>
          </button>

          <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
            {title}
          </span>
        </div>
        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 rounded-md overflow-hidden bg-surface-muted">
              <Image
                src={clienteLogo ?? "/images/alma4d-round-512.png"}
                alt="Cliente"
                fill
                sizes="64px"
                className="object-contain"
              />
            </div>
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="text-sm font-semibold text-foreground">
                {clienteNome?.trim().split(" ").slice(0, 2).join(" ")}
              </span>
              <span className="text-xs text-foreground/60">
                Gestão e Indicadores
              </span>
            </div>
            <PwaInstallButton />
          </div>
          {open && !loading && (
            <div
              className="absolute right-0 mt-2 w-52 bg-white rounded-md
                            shadow-lg border border-border py-1 text-sm z-50"
            >
              <Link
                href={`${basePath}/perfil`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-4 py-2 hover:bg-surface-muted"
              >
                <User size={16} />
                Meu perfil
              </Link>

              <Link
                href={`${basePath}/configuracoes`}
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
