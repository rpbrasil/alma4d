"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import Image from "next/image";

const ITEMS = [
  {
    href: "/nr1/mapeamento-riscos-psicossociais",
    label: "Visão geral",
  },
  {
    href: "/nr1/empresa",
    label: "Empresas",
  },
  {
    href: "/nr1/parceiros",
    label: "Parceiros",
  },
];

export function NR1SubNav() {
  const pathname = usePathname();

  const current =
    ITEMS.find((i) => pathname.startsWith(i.href))?.label ??
    "Mapeamento Psicossocial";

  return (
    <div className="mb-8">
      {/* 🔹 TOPO: breadcrumb + logo */}
      <div className="relative flex items-center justify-between mb-2">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <span>NR‑1</span>
          <ChevronRight size={12} />
          <span>{current}</span>
        </div>

        {/* ✅ LOGO ABSOLUTO (transborda) */}
        <div className="absolute mt-1 right-0 top-1/2 -translate-y-1/2 translate-x-2 pointer-events-none">
          <Image
            src="/images/alma4d_express_nobground.png"
            alt="alma4D"
            width={92}
            height={92}
            className="opacity-90"
            priority
          />
        </div>
      </div>

      {/* 🔹 TABS */}
      <nav className="flex gap-1 border-b border-border">
        {ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "px-3 py-2 text-sm rounded-t-md transition-all duration-200",
                active
                  ? "bg-surface text-brand font-semibold border border-border border-b-transparent shadow-sm"
                  : "text-slate-500 hover:text-brand hover:bg-slate-50",
              ].join(" ")}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
