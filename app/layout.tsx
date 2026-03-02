import "./globals.css";
import type { ReactNode } from "react";
import Link from "next/link";

export const metadata = {
  title: "alma4D",
  description:
    "Aplicativo alma4D – Conectando pessoas com cuidado e propósito.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-gray-50 text-gray-900 flex flex-col min-h-screen">
        <header className="border-b bg-white">
          <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
            <h1 className="text-xl font-bold text-blue-700">alma4D</h1>

            <nav className="flex gap-6 text-sm">
              <Link href="/" className="hover:text-blue-600">
                Início
              </Link>
              <Link href="/sobre" className="hover:text-blue-600">
                Sobre
              </Link>
              <Link href="/download" className="hover:text-blue-600">
                Download
              </Link>
              <Link href="/contato" className="hover:text-blue-600">
                Contato
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1 max-w-5xl mx-auto px-6 py-10">{children}</main>

        <footer className="border-t bg-white">
          <div className="max-w-5xl mx-auto px-6 py-6 text-sm text-gray-600">
            © {new Date().getFullYear()} alma4D — Todos os direitos reservados.
          </div>
        </footer>
      </body>
    </html>
  );
}
