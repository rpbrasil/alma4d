"use client";

import { useAuth } from "@/context/auth";
import { LogOut, Settings, User } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function DashboardHeader() {
  const { user, role, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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

  const userInitial = user?.email?.charAt(0).toUpperCase() ?? "?";

  if (typeof window === "undefined") {
    return null;
  }

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="h-14 px-6 flex items-center justify-between">
        {/* Left: Context / breadcrumb (futuro) */}
        <div className="text-sm text-slate-500">Dashboard</div>

        {/* Right: User */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors"
          >
            {/* Avatar neutro */}
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-semibold text-slate-700">
              {userInitial}
            </div>

            <div className="hidden sm:flex flex-col text-left">
              <span className="text-sm font-medium text-slate-900 leading-none">
                {user?.email?.split("@")[0]}
              </span>
              {role && (
                <span className="text-xs text-slate-500 capitalize">
                  {role}
                </span>
              )}
            </div>
          </button>

          {/* Dropdown */}
          {open && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-md shadow-lg border border-slate-200 py-1 text-sm z-50">
              <Link
                href="/dashboard/perfil"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50"
              >
                <User size={16} />
                Meu perfil
              </Link>

              <Link
                href="/dashboard/configuracoes"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50"
              >
                <Settings size={16} />
                Configurações
              </Link>

              <div className="my-1 border-t border-slate-200" />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50"
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
