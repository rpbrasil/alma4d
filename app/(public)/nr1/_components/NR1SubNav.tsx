"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

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

  return (
    <div className="mb-8">
      {/* Breadcrumb discreto */}
      <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
        <span>NR‑1</span>
        <ChevronRight size={12} />
        <span>
          {ITEMS.find((i) => pathname.startsWith(i.href))?.label ??
            "Mapeamento Psicossocial"}
        </span>
      </div>

      {/* Tabs */}
      <nav className="flex gap-1 border-b border-border">
        {ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "px-3 py-2 text-sm rounded-t-md transition",
                active
                  ? "bg-surface text-brand font-semibold border border-border border-b-transparent"
                  : "text-slate-500 hover:text-brand",
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
