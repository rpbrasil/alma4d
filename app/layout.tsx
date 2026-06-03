// app/layout.tsx
import "./globals.css";
import PwaRegister from "./PwaRegister";
import PwaIosBanner from "@/components/PwaIosBanner";

export const metadata = {
  title: "alma4D Express",
  description: "Gestão de riscos, documentos e questionários",

  // ✅ PWA
  manifest: "/app.webmanifest",
 
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },

  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "alma4D Express",
  },
};

export const viewport = {
  themeColor: "#030870",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen flex flex-col overflow-x-hidden">
        <PwaRegister />
        <PwaIosBanner />
        {children}
      </body>
    </html>
  );
}
