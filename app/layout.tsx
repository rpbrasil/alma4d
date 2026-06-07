// app/layout.tsx
import "./globals.css";
import PwaRegister from "./PwaRegister";
import PwaIosBanner from "@/components/PwaIosBanner";

export const metadata = {
  metadataBase: new URL("https://alma4d.com"),

  title: "alma4D Express",
  description: "Gestão de riscos, NR1, riscos psicossociais",

  openGraph: {
    title: "alma4D Express",
    description: "Gestão de riscos, NR1, riscos psicossociais",
    url: "https://alma4d.com",
    siteName: "alma4D",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "alma4D Express",
      },
    ],
    locale: "pt_BR",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "alma4D Express",
    description: "Gestão de riscos, documentos e questionários",
    images: ["/og-image.png"],
  },

  manifest: "/app.webmanifest",

  icons: [
    {
      rel: "icon",
      url: "/icons/icon-192.png",
      type: "image/png",
      sizes: "192x192",
    },
    { rel: "apple-touch-icon", url: "/icons/icon-192.png", sizes: "192x192" },
  ],

  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
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
