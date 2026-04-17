"use client";

import React from "react";
import dynamic from "next/dynamic";

// ✅ Importar componentes do react-pdf via dynamic para não rodar no SSR
const Document = dynamic(() => import("react-pdf").then((m) => m.Document), {
  ssr: false,
});
const Page = dynamic(() => import("react-pdf").then((m) => m.Page), {
  ssr: false,
});

type PdfCarouselProps = {
  fileUrl: string; // ex: "/documentos/metodo.pdf"
};

export default function PdfCarousel({ fileUrl }: PdfCarouselProps) {
  const [numPages, setNumPages] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [width, setWidth] = React.useState(600);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // ✅ Configura o worker SOMENTE no client e no mesmo módulo de uso do react-pdf
  React.useEffect(() => {
    let mounted = true;

    (async () => {
      const { pdfjs } = await import("react-pdf");
      if (!mounted) return;

      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // ✅ Responsivo: mede largura disponível
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const resize = () => setWidth(Math.min(el.clientWidth, 900));
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  function onLoadSuccess({ numPages: n }: { numPages: number }) {
    setNumPages(n);
    setPage(1);
  }

  return (
    <div className="w-full">
      {/* Controles */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="px-4 py-2 rounded-lg border border-[#030870]/20 disabled:opacity-50"
        >
          Anterior
        </button>

        <span className="text-sm font-semibold text-[#030870]">
          Página {page} de {numPages || "—"}
        </span>

        <button
          type="button"
          onClick={() => setPage((p) => Math.min(numPages || 1, p + 1))}
          disabled={!numPages || page >= numPages}
          className="px-4 py-2 rounded-lg bg-[#019499] text-white disabled:opacity-50"
        >
          Próxima
        </button>
      </div>

      {/* Viewer */}
      <div
        ref={containerRef}
        className="w-full rounded-2xl border border-[#030870]/10 bg-white shadow-sm overflow-hidden"
      >
        <div className="flex justify-center p-4 bg-[#030870]/3">
          <Document
            file={fileUrl}
            onLoadSuccess={onLoadSuccess}
            loading={<div className="p-10 text-[#030870]">Carregando PDF…</div>}
            error={
              <div className="p-10 text-red-600">
                Erro ao carregar o PDF. Verifique o caminho: <b>{fileUrl}</b>
              </div>
            }
          >
            <Page
              pageNumber={page}
              width={width}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              loading={
                <div className="p-10 text-[#030870]">Renderizando página…</div>
              }
            />
          </Document>
        </div>
      </div>

      {/* Indicadores */}
      {numPages > 1 && (
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {Array.from({ length: numPages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setPage(n)}
              className={[
                "h-2.5 w-2.5 rounded-full transition",
                n === page
                  ? "bg-[#DF633F]"
                  : "bg-[#030870]/20 hover:bg-[#030870]/40",
              ].join(" ")}
              aria-label={`Ir para página ${n}`}
              type="button"
            />
          ))}
        </div>
      )}
    </div>
  );
}
