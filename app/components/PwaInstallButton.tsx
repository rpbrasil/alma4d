"use client";

import { usePwaInstall } from "@/hooks/usePwaInstall";
import { Download } from "lucide-react";

export default function PwaInstallButton() {
  const { canInstall, install, installed } = usePwaInstall();
  if (installed) return null;
  if (!canInstall) return null;

  return (
    <button
      onClick={install}
      className="hidden sm:flex items-center gap-2 text-xs bg-brand text-white px-3 py-1.5 rounded-lg hover:brightness-95 transition"
    >
      <Download size={14} />
      Instalar app
    </button>
  );
}
