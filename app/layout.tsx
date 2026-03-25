import "./globals.css";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";

config.autoAddCss = false;
export const metadata = {
  title: "alma4D",
  description:
    "Aplicativo alma4D – Conectando pessoas com cuidado e propósito.",
  metadataBase: new URL("https://alma4d.com.br"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 max-w-5xl mx-auto px-6 mt-12">
          {children}
          <div className="flex-1" />
        </main>
        <Footer />
      </body>
    </html>
  );
}
