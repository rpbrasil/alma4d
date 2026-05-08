import { PublicHeader } from "@/components/public/PublicHeader";
import { Footer } from "@/components/public/Footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PublicHeader />

      {/* ✅ container único e estável */}
      <main className="flex-1 max-w-5xl mx-auto px-6 mt-12 overflow-x-hidden">
        {children}
      </main>

      <Footer />
    </>
  );
}
