"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/auth";

export function Sidebar() {
  const pathname = usePathname();
  const { role } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      roles: ["admin", "cliente", "gestor"],
    },
    {
      href: "/dashboard/profissionais",
      label: "Profissionais",
      icon: Users,
      roles: ["admin", "cliente"],
    },
    {
      href: "/dashboard/relatorios",
      label: "Relatórios",
      icon: BarChart3,
      roles: ["admin", "cliente", "gestor"],
    },
    {
      href: "/dashboard/usuarios",
      label: "Usuários",
      icon: Users,
      roles: ["admin", "cliente"],
    },
    {
      href: "/dashboard/configuracoes",
      label: "Configurações",
      icon: Settings,
      roles: ["admin", "cliente"],
    },
  ];

  const filteredItems = navItems.filter((item) =>
    role ? item.roles.includes(role) : false,
  );

  const isActive = (href: string) => pathname === href;

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-md bg-white shadow-sm"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          bg-[#030870] text-white
          w-64 min-h-screen shrink-0
          
          fixed inset-y-0 left-0 z-40
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          
          md:static md:translate-x-0
        `}
      >
        {/* Brand */}
        <div className="px-6 py-5 border-b border-white/10">
          <h1 className="text-lg font-semibold tracking-wide">alma4D</h1>
          <p className="text-xs text-white/60 mt-1">Painel Administrativo</p>
        </div>

        {/* Navigation */}
        <nav className="mt-6 space-y-1 px-3">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`
                  group flex items-center gap-3 px-3 py-2.5 rounded-md text-sm
                  transition-colors
                  ${
                    active
                      ? "bg-white/10 text-white border-l-2 border-[#019499]"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  }
                `}
              >
                <Icon
                  size={18}
                  className={active ? "text-[#019499]" : "text-white/60"}
                />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="mt-auto px-6 py-4 border-t border-white/10 text-xs text-white/50">
          © alma4D · 2024
        </div>
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
