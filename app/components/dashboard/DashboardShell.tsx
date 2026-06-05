"use client";

import { useState } from "react";
import { AuthProvider } from "@/context/auth";
import Sidebar from "@/components/dashboard/Sidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <AuthProvider>
      <div className="flex min-h-screen bg-gray-100">
        {/* Sidebar */}
        <Sidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

        {/* Conteúdo */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <DashboardHeader
            onMenuClick={() => setMenuOpen(true)}
            isMenuOpen={menuOpen}
          />

          {/* Main */}
          <main className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-7xl mx-auto">{children}</div>
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}
