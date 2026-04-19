"use client";

import { useEffect, useState } from "react";
import PdfCarousel from "./PdfCarousel";

type MetodoModalProps = {
  fileUrl?: string;
};

export default function MetodoModal({
  fileUrl = "/documentos/metodo.pdf",
}: MetodoModalProps) {
  const [open, setOpen] = useState(false);

  // Fecha com ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // (opcional) trava scroll do body quando modal abre
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
      const check = () => setIsMobile(window.innerWidth < 768);
      check();
      window.addEventListener("resize", check);
      return () => window.removeEventListener("resize", check);
    }, []);

    return isMobile;
  }
  const isMobile = useIsMobile();
  return (
    <>
      {/* BOTÃO */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl bg-[#030870] px-8 py-4 text-white font-bold hover:bg-[#030870]/90 transition-all shadow-lg shadow-blue-900/20 text-center"
      >
        Conhecer o Método
      </button>

      {/* MODAL */}
      {/* MODAL */}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2"
          role="dialog"
          aria-modal="true"
        >
          {/* BACKDROP */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />

          {/* CONTEÚDO */}
          <div
            className={`
        relative z-10 w-full max-w-5xl
        ${isMobile ? "max-h-[94vh]" : "max-h-[98vh]"}
        rounded-2xl bg-white shadow-2xl
        overflow-hidden flex flex-col
      `}
          >
            {/* HEADER */}
            <div className="flex items-center justify-between gap-4 border-b border-black/10 px-4 py-3 shrink-0">
              <h3 className="text-lg font-bold text-[#030870]">
                Conheça o Método
              </h3>

              <div className="flex items-center gap-3">
                {!isMobile && (
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold text-[#019499] hover:underline"
                  >
                    Abrir em nova aba
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-2 py-1 text-[#030870] hover:bg-[#030870]/10"
                  aria-label="Fechar"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* BODY */}
            <div className="flex-1 overflow-hidden">
              <PdfCarousel
                fileUrl={fileUrl}
                showControls
                compactControls={!isMobile}                
              />
            </div>

            {/* FOOTER — SOMENTE MOBILE */}
            {isMobile && (
              <div className="shrink-0 border-t border-black/10 p-4 flex justify-between gap-3">
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-black/10 px-4 py-2 font-semibold text-[#030870]"
                >
                  Abrir PDF
                </a>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl bg-[#019499] px-4 py-2 font-semibold text-white"
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
