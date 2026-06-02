"use client";

import { AuthProvider } from "@/context/auth";
import Sidebar from "@/components/dashboard/Sidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { useState } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ✅ estado do menu mobile
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <AuthProvider>
      <div className="flex min-h-screen bg-gray-200 overflow-x-hidden">
        {/* ✅ SIDEBAR */}
        <Sidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

        {/* ✅ CONTEÚDO */}
        <div className="flex-1 flex flex-col w-full md:ml-64">
          {/* ✅ HEADER */}
          <DashboardHeader onMenuClick={() => setMenuOpen(true)} />

          {/* ✅ MAIN */}
          <main className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-7xl mx-auto">{children}</div>
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}
