import "./globals.css";
import type { ReactNode } from "react";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";

export const metadata = {
  title: "alma4D",
  description:
    "Aplicativo alma4D – Conectando pessoas com cuidado e propósito.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-background text-foreground flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 max-w-5xl mx-auto px-6 py-10">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
