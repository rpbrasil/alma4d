"use client";

// Tipagem mínima do workflow realmente usado:
// html2pdf().set().from().save()
type Html2PdfWorker = {
  set: (opts: unknown) => Html2PdfWorker;
  from: (el: HTMLElement) => Html2PdfWorker;
  save: () => Promise<void>;
};

type Html2PdfFactory = () => Html2PdfWorker;

export async function downloadPdfFromElement(opts: {
  element: HTMLElement;
  filename: string;
}) {
  const { element, filename } = opts;

  const mod = await import("html2pdf.js");
  const html2pdf = mod.default as unknown as Html2PdfFactory;

  const options = {
    filename,
    margin: 10,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },

    // Evita quebrar tabelas/linhas no inventário completo
    pagebreak: {
      mode: ["avoid-all", "css", "legacy"],
      avoid: ["tr"],
    },
  };

  await html2pdf().set(options).from(element).save();
}
