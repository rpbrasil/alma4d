"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { AuthProvider } from "@/context/auth";

const SidebarExpress = dynamic(() => import("./ExpressSidebar"), {
  ssr: false,
});

// const ExpressHeader = dynamic(() => import("./ExpressHeader"), {
//   ssr: false,
// });

export default function DashboardExpressLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AuthProvider>
      <div className="flex min-h-screen bg-gray-100">
        <SidebarExpress
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="flex-1 flex flex-col ">
          {/* <ExpressHeader onMenuOpen={() => setSidebarOpen(true)} /> */}

          <main className="flex-1 p-4 sm:p-6">
            <div className="max-w-7xl w-full mx-auto">{children}</div>
          </main>
        </div>

        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </div>
    </AuthProvider>
  );
}
