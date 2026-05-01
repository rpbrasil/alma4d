import dynamic from "next/dynamic";

const DashboardShell = dynamic(
  () =>
    import("@/components/dashboard/DashboardShell").then(
      (m) => m.DashboardShell,
    ),
  { ssr: false }, // ✅ chave da correção
);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
