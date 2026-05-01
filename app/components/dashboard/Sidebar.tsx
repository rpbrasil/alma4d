"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Menu, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "@/context/auth";
import type { LucideIcon } from "lucide-react";

import { useSyncExternalStore } from "react";

function useIsClient() {
  return useSyncExternalStore(
    () => () => {}, // subscribe noop
    () => true, // client snapshot
    () => false, // server snapshot
  );
}

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: string[];
};
const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "cliente", "gestor"],
  },
  {
    href: "/dashboard/admin/clientes",
    label: "Clientes",
    icon: Users,
    roles: ["admin"],
  },
];
export function Sidebar() {
  const pathname = usePathname();
  const { role } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const filteredItems = useMemo(
    () => navItems.filter((item) => (role ? item.roles.includes(role) : false)),
    [role],
  );

  // ativo mais “inteligente”: destaca também sub-rotas
  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };
  const isClient = useIsClient();
  if (!isClient) return null;
  return (
    <>
      {/* Mobile toggle */}
      <button
        type="button"
        aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
        onClick={() => setIsOpen((v) => !v)}
        className="fixed top-4 left-4 z-50 md:hidden inline-flex items-center justify-center
                   h-10 w-10 rounded-xl border border-border bg-surface shadow-sm
                   hover:bg-surface-muted transition"
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
          "md:static md:translate-x-0",
        ].join(" ")}
      >
        <div className="h-full flex flex-col">
          {/* Brand */}
          <div className="px-5 py-4 border-b border-white/10">
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary/40"
            >
              <div className="relative h-9 w-32">
                <Image
                  src="/images/alma4d-bicolor-nobground-256.webp"
                  alt="alma4D"
                  fill
                  sizes="(max-width: 768px) 128px, 160px"
                  className="object-contain"
                  priority
                />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight tracking-wide">
                  Painel
                </p>
                <p className="text-xs text-white/60 leading-tight">
                  Administrativo
                </p>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="px-3 py-3 space-y-1">
            {filteredItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm",
                    "transition-colors outline-none",
                    "focus-visible:ring-2 focus-visible:ring-brand-secondary/40",
                    active
                      ? "bg-white/12 text-white"
                      : "text-white/75 hover:text-white hover:bg-white/8",
                  ].join(" ")}
                >
                  {/* Active indicator (barra) */}
                  <span
                    className={[
                      "absolute left-0 top-1/2 -translate-y-1/2 h-7 w-1 rounded-r-full transition",
                      active ? "bg-brand-secondary" : "bg-transparent",
                    ].join(" ")}
                    aria-hidden="true"
                  />

                  <Icon
                    size={18}
                    className={
                      active
                        ? "text-brand-secondary"
                        : "text-white/70 group-hover:text-white"
                    }
                  />

                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="mt-auto px-5 py-4 border-t border-white/10">
            <p className="text-xs text-white/55">
              © {new Date().getFullYear()} alma4D
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
