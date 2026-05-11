"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { FileText, ClipboardList, QrCode, Home, X } from "lucide-react";

const EXPRESS_NAV = [
  {
    href: "/dashboard/express",
    label: "Visão geral",
    icon: Home,
  },
  {
    href: "/dashboard/express/contrato",
    label: "Contrato",
    icon: FileText,
  },
  {
    href: "/dashboard/express/nota-fiscal",
    label: "Nota fiscal",
    icon: FileText,
  },
  {
    href: "/dashboard/express/copsoq",
    label: "Relatório COPSOQ",
    icon: ClipboardList,
  },
  {
    href: "/dashboard/express/login",
    label: "Acesso de usuários",
    icon: QrCode,
  },
];

const DEFAULT_EXPRESS_IMAGE = "/images/alma4d_express_nobground.png";

export default function ExpressSidebar({
  open,
  onClose,
  userImage,
  clientImage,
}: {
  open: boolean;
  onClose: () => void;
  userImage?: string;
  clientImage?: string;
}) {
  const pathname = usePathname();
  const [logoFailed, setLogoFailed] = useState(false);
  const logoSrc =
    logoFailed || (!userImage && !clientImage)
      ? DEFAULT_EXPRESS_IMAGE
      : (userImage ?? clientImage ?? DEFAULT_EXPRESS_IMAGE);

  return (
    <aside
      className={[
        "bg-brand text-white w-64 shrink-0 fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out",
        open ? "translate-x-0" : "-translate-x-full",
        "md:translate-x-0",
      ].join(" ")}
    >
      <div className="h-screen flex flex-col">
        <div className="px-5 py-4 border-b border-white/10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 overflow-hidden rounded-full border border-white/10 bg-white/10">
                <Image
                  src={logoSrc}
                  alt="Express"
                  fill
                  className="object-cover"
                  onError={() => setLogoFailed(true)}
                  priority
                />
              </div>
              <div>
                <p className="text-sm font-semibold">Dashboard Express</p>
                <p className="text-xs text-white/70">Acesso rápido</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white transition-colors hover:bg-white/15 md:hidden"
              aria-label="Fechar menu"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {EXPRESS_NAV.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/dashboard/express"
                ? pathname === item.href
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors",
                  active
                    ? "bg-white/12 text-white"
                    : "text-white/75 hover:bg-white/10 hover:text-white",
                ].join(" ")}
              >
                <Icon size={18} className="text-white/80" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
