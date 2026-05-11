"use client";

import Image from "next/image";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

const EXPRESS_TITLE_MAP: Record<string, string> = {
  "/dashboard/express": "Painel Express",
  "/dashboard/express/contrato": "Contrato",
  "/dashboard/express/nota-fiscal": "Nota fiscal",
  "/dashboard/express/copsoq": "Relatório COPSOQ",
  "/dashboard/express/login": "Acesso de usuários",
};

export default function ExpressHeader({
  onMenuOpen,
}: {
  onMenuOpen: () => void;
}) {
  const pathname = usePathname();

  const title = useMemo(() => {
    return EXPRESS_TITLE_MAP[pathname] ?? "Dashboard Express";
  }, [pathname]);

  return (
    <header className="bg-white border-b border-border sticky top-0 z-30">
      <div className="h-20 px-4 sm:px-6 flex flex-col justify-center gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onMenuOpen}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-slate-700 transition hover:bg-surface-muted md:hidden"
              aria-label="Abrir menu"
            >
              <Menu size={18} />
            </button>

            <div className="relative h-14 w-14 rounded-2xl overflow-hidden bg-slate-100">
              <Image
                src="/images/alma4d_express_nobground.png"
                alt="Express"
                fill
                className="object-contain"
                priority
              />
            </div>

            <div>
              <p className="text-base font-semibold text-slate-900">{title}</p>
              <p className="text-sm text-slate-500">
                Links rápidos para contrato, nota, COPSOQ e login do usuário
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
