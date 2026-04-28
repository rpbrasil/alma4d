import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { AuthProvider } from "@/context/auth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-100">
        <div className="flex">
          {/* Sidebar */}
          <Sidebar />

          {/* Conteúdo */}
          <div className="flex-1 flex flex-col">
            {/* Header do dashboard */}
            <DashboardHeader />

            {/* Página */}
            <main className="flex-1 p-6 overflow-y-auto">
              <div className="max-w-7xl mx-auto">{children}</div>
            </main>
          </div>
        </div>
      </div>
    </AuthProvider>
  );
}
