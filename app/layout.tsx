import "./globals.css";
import { Header } from "./components/Header";
import dynamic from "next/dynamic";
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://alma4d.com.br"),
};

const Footer = dynamic(() =>
  import("./components/Footer").then((mod) => mod.Footer),
);

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 max-w-5xl mx-auto px-6 mt-12">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
