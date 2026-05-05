"use client";

import dynamic from "next/dynamic";
import { AuthProvider } from "@/context/auth";

const Sidebar = dynamic(() => import("@/components/dashboard/Sidebar"), {
  ssr: false,
});

const DashboardHeader = dynamic(
  () => import("@/components/dashboard/DashboardHeader"),
  { ssr: false },
);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen bg-gray-100">
        <Sidebar />

        <div className="flex-1 flex flex-col md:ml-64">
          <DashboardHeader />

          <main className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-7xl mx-auto">{children}</div>
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}
