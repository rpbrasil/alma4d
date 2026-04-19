"use client";

import React from "react";
import dynamic from "next/dynamic";

// ✅ Importar react-pdf sem SSR
const Document = dynamic(() => import("react-pdf").then((m) => m.Document), {
  ssr: false,
});
const Page = dynamic(() => import("react-pdf").then((m) => m.Page), {
  ssr: false,
});

type PdfCarouselProps = {
  fileUrl: string;
  showControls?: boolean;
  compactControls?: boolean;
};

export default function PdfCarousel({
  fileUrl,
  showControls = true,
  compactControls = false,
}: PdfCarouselProps) {
  const [numPages, setNumPages] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [width, setWidth] = React.useState(600);

  const containerRef = React.useRef<HTMLDivElement>(null);

  // ✅ Worker do pdf.js
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

  // ✅ Responsivo (largura)
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const resize = () => {
      setWidth(Math.min(el.clientWidth, 1100));
    };

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
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* ✅ CONTROLES */}
      {showControls && (
        <div
          className={[
            "shrink-0 flex items-center gap-3 bg-white",
            compactControls
              ? "justify-end px-4 py-2"
              : "justify-between px-4 py-3 border-b border-[#030870]/10",
          ].join(" ")}
        >
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-4 py-2 rounded-lg border border-[#030870]/20 disabled:opacity-50"
          >
            Anterior
          </button>

          {!compactControls && (
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-4 py-2 rounded-lg border border-[#030870]/20 disabled:opacity-50"
            >
              Anterior
            </button>
          )}

          {!compactControls && (
            <span className="text-sm font-semibold text-[#030870]">
              Página {page} de {numPages || "—"}
            </span>
          )}

          <button
            type="button"
            onClick={() => setPage((p) => Math.min(numPages || 1, p + 1))}
            disabled={!numPages || page >= numPages}
            className="px-4 py-2 rounded-lg bg-[#019499] text-white disabled:opacity-50"
          >
            Próxima
          </button>
        </div>
      )}

      {/* ✅ PDF */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden bg-[#030870]/3 flex items-center justify-center"
      >
        <Document
          file={fileUrl}
          onLoadSuccess={onLoadSuccess}
          loading={<div className="p-10 text-[#030870]">Carregando PDF…</div>}
          error={
            <div className="p-10 text-red-600">
              Erro ao carregar o PDF. Caminho inválido: <b>{fileUrl}</b>
            </div>
          }
        >
          <Page
            pageNumber={page}
            width={width}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        </Document>
      </div>

      {/* ✅ INDICADORES — só quando NÃO compacto */}
      {showControls && !compactControls && numPages > 1 && (
        <div className="shrink-0 flex flex-wrap justify-center gap-2 py-3 border-t border-[#030870]/10 bg-white">
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
