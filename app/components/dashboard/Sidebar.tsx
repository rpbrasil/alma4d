"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Menu,
  X,
  BarChart3,
  Settings,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "@/context/auth";
import type { LucideIcon } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: string[];
};

/**
 * ✅ Itens de navegação
 * Roles sempre em lowercase
 */
const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Visão geral",
    icon: LayoutDashboard,
    roles: ["admin", "cliente", "gestor"],
  },

  // Relatórios (Todos)
  {
    href: "/dashboard/relatorios",
    label: "Relatórios",
    icon: BarChart3,
    roles: ["admin", "cliente", "gestor"],
  },
  // Usuários (Todos)
  {
    href: "/dashboard/admin/usuarios",
    label: "Usuários",
    icon: Users,
    roles: ["admin", "cliente", "gestor"],
  },
  // Admin - Clientes
  {
    href: "/dashboard/admin/clientes",
    label: "Clientes",
    icon: Users,
    roles: ["admin"],
  },
  // Profissionais (Cliente + Admin)
  {
    href: "/dashboard/profissionais",
    label: "Profissionais",
    icon: Users,
    roles: ["admin", "cliente", "gestor"],
  },
  // Configurações (Todos)
  {
    href: "/dashboard/configuracoes",
    label: "Configurações",
    icon: Settings,
    roles: ["admin", "cliente", "gestor"],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, role, loading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const normalizedRole = role?.toLowerCase();

  /**
   * ✅ Filtra menu somente após auth resolver
   * Durante loading, mantém HTML estável
   */
  const items = useMemo(() => {
    if (loading || !normalizedRole) return [];
    return NAV_ITEMS.filter((item) => item.roles.includes(normalizedRole));
  }, [loading, normalizedRole]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  /**
   * ✅ Placeholders estáveis (server === client)
   */
  const username =
    !loading && user?.email ? user.email.split("@")[0] : "Usuário";

  return (
    <div suppressHydrationWarning>
      <button
        type="button"
        aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
        onClick={() => setIsOpen((v) => !v)}
        className="fixed top-4 left-4 z-50 md:hidden h-10 w-10
                   rounded-xl border border-border bg-white shadow-sm
                   flex items-center justify-center"
      >
        {isOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Sidebar */}
      <aside
        className={[
          "bg-brand text-white w-64 min-h-screen shrink-0",
          "fixed inset-y-0 left-0 z-40",
          "transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "md:sticky md:top-0 md:translate-x-0",
        ].join(" ")}
      >
        <div className="min-h-screen flex flex-col">
          {/* Brand + User */}
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
              <div>
                <p className="text-sm font-semibold leading-tight">
                  {username}
                </p>
                {!loading && normalizedRole && (
                  <p className="text-xs text-white/60 capitalize">
                    {normalizedRole}
                  </p>
                )}
              </div>
            </Link>
          </div>

          {/* Navigation */}
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
                  {/* Active indicator */}
                  <span
                    className={[
                      "absolute left-0 top-1/2 -translate-y-1/2 h-7 w-1 rounded-r-full",
                      active ? "bg-brand-secondary" : "bg-transparent",
                    ].join(" ")}
                    aria-hidden="true"
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

          {/* Footer */}
          <div className="mt-auto px-5 py-4 border-t border-white/10">
            <p className="text-xs text-white/55">© alma4D</p>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
