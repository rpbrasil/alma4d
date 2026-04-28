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
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 hover:bg-gray-100 rounded-lg"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-linear-to-b from-[#030870] to-[#001a4d] text-white shadow-lg transition-transform duration-300 ease-in-out z-40
          ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-blue-700">
          <h1 className="text-2xl font-bold">Alma4D</h1>
          <p className="text-blue-200 text-sm mt-1">Dashboard</p>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                  ${
                    active
                      ? "bg-[#019499] text-white shadow-md"
                      : "text-blue-100 hover:bg-blue-700 hover:text-white"
                  }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-blue-700">
          <p className="text-blue-200 text-xs text-center">Alma4D © 2024</p>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
