"use client";

import { AuthProvider } from "@/context/auth";
import Sidebar from "@/components/dashboard/Sidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { useState } from "react";
import { useIsStandalone } from "@/hooks/useIsStandalone";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isStandalone = useIsStandalone();

  return (
    <AuthProvider>
      <div
        className={`flex min-h-screen overflow-x-hidden ${
          isStandalone ? "bg-white" : "bg-gray-200"
        }`}
      >
        {/* ✅ SIDEBAR */}
        {/* 👉 Oculta automaticamente no modo app em mobile */}
        {!isStandalone && (
          <Sidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
        )}

        {/* ✅ CONTEÚDO */}
        <div
          className={`
            flex-1 flex flex-col w-full
            ${isStandalone ? "" : "md:ml-64"}
          `}
        >
          {/* ✅ HEADER */}
          <DashboardHeader onMenuClick={() => setMenuOpen(true)} />

          {/* ✅ MAIN */}
          <main
            className={`
              flex-1 overflow-y-auto
              ${isStandalone ? "p-4" : "p-6"}
            `}
          >
            <div
              className={`
                mx-auto
                ${isStandalone ? "max-w-full" : "max-w-7xl"}
              `}
            >
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}
