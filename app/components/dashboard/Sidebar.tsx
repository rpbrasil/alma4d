"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  Settings,
  User,
  LogOut,
  LucideIcon,
  FileText,
  ClipboardList,
  QrCode,
  Home,
  Users,
  UserX,
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { useAuth } from "@/context/auth";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: string[];
};

type Plano = "express" | "premium";

const NAV_BY_PLAN: Record<Plano, NavItem[]> = {
  express: [
    {
      href: "/dashboard/express",
      label: "Inclusão de usuários",
      icon: Home,
    },
    {
      href: "/dashboard/express/documentos",
      label: "Documentos",
      icon: FileText,
    },
    {
      href: "/dashboard/express/copsoq",
      label: "Acesso ao Questionário",
      icon: QrCode,
    },
    {
      href: "/dashboard/express/parceiros",
      label: "Parceiros",
      icon: Users,
    },
    {
      href: "/dashboard/express/relatorio-copsoq",
      label: "Relatório NR-1 | Psicossocial",
      icon: ClipboardList,
    },
    {
      href: "/dashboard/admin/financeiro",
      label: "Financeiro",
      icon: BarChart3,
      roles: ["admin"],
    },
    {
      href: "/dashboard/admin/deletar-usuario",
      label: "Deletar usuário",
      icon: UserX,
      roles: ["admin"],
    },
  ],
  premium: [
    {
      href: "/dashboard/premium",
      label: "Visão geral",
      icon: LayoutDashboard,
      roles: ["admin", "cliente", "gestor"],
    },
    {
      href: "/dashboard/premium/relatorios",
      label: "Relatórios",
      icon: BarChart3,
      roles: ["admin", "cliente", "gestor"],
    },
    {
      href: "/dashboard/admin/usuarios",
      label: "Usuários",
      icon: Users,
      roles: ["admin", "cliente", "gestor"],
    },
    {
      href: "/dashboard/admin/clientes",
      label: "Clientes",
      icon: Users,
      roles: ["admin"],
    },
    {
      href: "/dashboard/premium/profissionais",
      label: "Profissionais",
      icon: Users,
      roles: ["admin", "cliente", "gestor"],
    },
    {
      href: `/dashboard/premium/configuracoes`,
      label: "Configurações",
      icon: Settings,
      roles: ["admin", "cliente", "gestor"],
    },
    {
      href: "/dashboard/admin/financeiro",
      label: "Financeiro",
      icon: BarChart3,
      roles: ["admin"],
    },
    {
      href: "/dashboard/admin/deletar-usuario",
      label: "Deletar usuário",
      icon: UserX,
      roles: ["admin"],
    },
  ],
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, signOut, plano } = useAuth();

  const effectivePlano: Plano = plano ?? "express";
  const [isOpen, setIsOpen] = useState(false);
  const [displayName, setDisplayName] = useState("Usuário");

  const role = user?.app_metadata?.claims?.role?.trim().toLowerCase();

  const items = useMemo(() => {
    if (!role) return [];

    const planItems = NAV_BY_PLAN[effectivePlano] || [];

    return planItems.filter((item) => {
      if (!item.roles) return true;
      return item.roles.includes(role);
    });
  }, [effectivePlano, role]);

  const isActive = (href: string) => {
    if (href === "/dashboard/express" || href === "/dashboard/premium") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  useEffect(() => {
    if (loading || !user?.id) return;

    let mounted = true;

    (async () => {
      try {
        const { supabase } = await import("@/lib/supabase/client");

        const { data } = await supabase
          .from("usuarios")
          .select("nome_completo")
          .eq("id", user.id)
          .single();

        if (mounted && data?.nome_completo) {
          setDisplayName(data.nome_completo);
        }
      } catch {
        // silent fallback
      }
    })();

    return () => {
      mounted = false;
    };
  }, [loading, user?.id]);

  if (loading || !user) return null;

  return (
    <div suppressHydrationWarning>
      <aside
        className={[
          "bg-brand text-white w-64 shrink-0",
          "fixed inset-y-0 left-0 z-40",
          "transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0",
        ].join(" ")}
      >
        <div className="h-screen flex flex-col">
          <div className="px-5 py-4 border-b border-white/10">
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3"
            >
              <div className="relative h-12 w-12 rounded-full overflow-hidden">
                <Image
                  src="/images/alma4d-round-512.png"
                  alt="alma4D"
                  fill
                  sizes="48px"
                  className="object-cover"
                  priority
                />
              </div>
              <p className="text-sm font-semibold leading-tight">
                {displayName}
              </p>
            </Link>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
            {items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm",
                    "transition-colors",
                    active
                      ? "bg-white/12 text-white"
                      : "text-white/75 hover:bg-white/8 hover:text-white",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "absolute left-0 top-1/2 -translate-y-1/2 h-7 w-1 rounded-r-full",
                      active ? "bg-brand-secondary" : "bg-transparent",
                    ].join(" ")}
                  />

                  <Icon
                    size={18}
                    className={
                      active ? "text-brand-secondary" : "text-white/70"
                    }
                  />

                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="px-3 py-3 border-t border-white/10 space-y-1">
            <Link
              href="/dashboard/perfil"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                         text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            >
              <User size={18} />
              <span className="font-medium">Meu perfil</span>
            </Link>

            <button
              type="button"
              onClick={async () => {
                await signOut();
                router.push("/");
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                         text-red-300 hover:bg-red-500/10 hover:text-red-200 transition-colors"
            >
              <LogOut size={18} />
              <span className="font-medium">Sair</span>
            </button>
          </div>
        </div>
      </aside>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
