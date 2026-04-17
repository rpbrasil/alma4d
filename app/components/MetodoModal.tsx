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
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          {/* BACKDROP */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />

          {/* CONTEÚDO */}
          <div className="relative z-10 w-full max-w-4xl rounded-2xl bg-white shadow-2xl overflow-hidden">
            {/* HEADER */}
            <div className="flex items-center justify-between gap-4 border-b border-black/10 p-6">
              <div>
                <h3 className="text-xl font-bold text-[#030870]">
                  Conheça o Método
                </h3>
                <p className="text-sm text-[#030870]/70">
                  Navegue pelas páginas do PDF usando os controles.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-[#030870] hover:bg-[#030870]/10"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            {/* BODY (PDF) */}
            <div className="p-6">
              <PdfCarousel fileUrl={fileUrl} />
            </div>

            {/* FOOTER */}
            <div className="flex flex-wrap justify-end gap-3 border-t border-black/10 p-6">
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-black/10 px-5 py-2.5 font-semibold text-[#030870] hover:bg-black/5"
              >
                Abrir em nova aba
              </a>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl bg-[#019499] px-5 py-2.5 font-semibold text-white hover:bg-[#019499]/90"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
