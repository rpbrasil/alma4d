"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function BackFloatingButton() {
  const router = useRouter();

  function handleBack() {
    router.back();
  }

  return (
    <button
      onClick={handleBack}
      className="
        fixed 
        bottom-6 
        right-6 
        z-50
        p-3 
        rounded-full
        bg-white/80 dark:bg-slate-800/80
        backdrop-blur
        border border-slate-200
        shadow-md
        hover:bg-white
        active:scale-95
        transition
      "
      aria-label="Voltar"
    >
      <ArrowLeft size={20} />
    </button>
  );
}
