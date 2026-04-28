"use client";

import { useAuth } from "@/context/auth";
import { LogOut, User, Settings } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function Header() {
  const { user, role, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40 md:ml-64">
      <div className="px-6 py-4 flex items-center justify-between">
        {/* Left side - could have breadcrumbs */}
        <div className="flex-1" />

        {/* Right side - User Menu */}
        <div className="flex items-center gap-4">
          {/* User Role Badge */}
          {role && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              {role === "admin" && "👨‍💼 Admin"}
              {role === "cliente" && "🏢 Cliente"}
              {role === "gestor" && "👤 Gestor"}
              {role === "usuario" && "👥 Usuário"}
            </span>
          )}

          {/* User Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-linear-to-br from-[#030870] to-[#019499] flex items-center justify-center text-white text-sm font-bold">
                {user?.email?.[0]?.toUpperCase() || "?"}
              </div>
              <span className="text-sm font-medium text-gray-700 hidden sm:block">
                {user?.email?.split("@")[0]}
              </span>
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">
                    {user?.email}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {role && role.charAt(0).toUpperCase() + role.slice(1)}
                  </p>
                </div>

                <Link
                  href="/dashboard/perfil"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <User size={16} />
                  Meu Perfil
                </Link>

                <Link
                  href="/dashboard/configuracoes"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Settings size={16} />
                  Configurações
                </Link>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100 mt-2"
                >
                  <LogOut size={16} />
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
