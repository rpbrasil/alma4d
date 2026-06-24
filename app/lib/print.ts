export async function printElement(
  el: HTMLElement | null,
  opts?: { title?: string; timeoutMs?: number; logoUrl?: string },
) {
  if (!el) throw new Error("Elemento não encontrado para impressão");

  const title = opts?.title ?? document.title ?? "Relatório";
  const timeoutMs = opts?.timeoutMs ?? 2500;

  // Collect styles (link[rel=stylesheet] and inline <style>) from current document
  const styleNodes = Array.from(
    document.querySelectorAll('link[rel="stylesheet"], style'),
  ) as Element[];

  const stylesHtml = styleNodes.map((n) => n.outerHTML).join("\n");

  const printOverrides = `
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
    <style>
      /* Prefer a self-hosted Inter (place WOFF2 in /public/fonts/Inter-Variable.woff2) */
      @font-face {
        font-family: 'InterLocal';
        src: url('/fonts/Inter-Variable.woff2') format('woff2');
        font-weight: 100 900;
        font-style: normal;
        font-display: swap;
      }
      @page { size: A4 portrait; margin: 12mm; }
      html,body { -webkit-print-color-adjust: exact; color-adjust: exact; }
      body { font-family: InterLocal, Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; color: #0f172a; font-size: 12px; line-height: 1.45; }
      h1 { font-size: 20px; margin: 0 0 6px 0; }
      h2 { font-size: 16px; margin: 0 0 4px 0; }
      p { margin: 0 0 8px 0; }
      .no-print { display: none !important; }
      img { max-width: 100%; height: auto; display: block; }
      table { border-collapse: collapse; width: 100%; page-break-inside: auto; }
      th, td { padding: 6px 8px; border: 1px solid #e6eef0; }
      tr { page-break-inside: avoid; page-break-after: auto; }
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
      .page-break { page-break-after: always; break-after: page; }
      * { box-sizing: border-box; }

      /* Header / Footer (rendered as part of document flow for printing)
        Avoid position:fixed which can overlap page content in some printers
        and browsers. Keeping header/footer in the flow prevents them from
        covering body text when printed. */
      .print-header { position: static; margin: 0 0 6mm 0; display:flex; align-items:center; justify-content:space-between; gap:12px; height: auto; }
      .print-header .logo { width: 48px; height: 48px; object-fit:contain; }
      .print-header .title { display:flex; flex-direction:column; align-items:flex-end; gap:2px; }
      .print-header .title .company { font-weight:600; font-size:13px; color:#0f172a; }
      .print-header .title .meta { font-size:11px; color:#475569; }

      .print-footer { position: static; margin: 12mm 0 0 0; font-size: 10px; color: #6b7280; text-align: center; }

      /* Content container spacing adjusted to leave room for header/footer in flow */
      .print-container { max-width: 794px; margin: 0 auto; padding-top: 6mm; padding-bottom: 12mm; }

      /* Improve chart/table scaling */
      .chart, .report-table { width: 100% !important; }

      /* Force single-column layout inside the printed report to avoid
         accidental multi-column rules from site CSS (some themes apply
         'column-count' or 'columns' to large text blocks). This ensures
         the first page and subsequent pages use the full page width. */
      .print-container, .print-container * {
        -webkit-column-count: 1 !important;
        -moz-column-count: 1 !important;
        column-count: 1 !important;
        -webkit-column-gap: normal !important;
        -moz-column-gap: normal !important;
        column-gap: normal !important;
      }

      /* Force the report "cover" header to stack vertically (single column)
         Override inline or component-level flex that creates 3 columns on the
         first page. This targets common class names used in reports without
         changing the source component. */
      .print-container .cover-header {
        display: block !important;
        -webkit-box-orient: vertical !important;
        -webkit-flex-direction: column !important;
        flex-direction: column !important;
        align-items: stretch !important;
      }

      /* Keep images constrained: do not let images expand to full width */
      .print-container .cover-header > *:not(img) {
        display: block !important;
        width: 100% !important;
        float: none !important;
        margin-bottom: 8px !important;
      }

      .print-container .cover-header img {
        display: inline-block !important;
        width: auto !important;
        height: auto !important;
        max-width: 140px !important;
        max-height: 140px !important;
        margin-bottom: 8px !important;
      }
    </style>
  `;

  // Clone the element to avoid copying inline `style="display:none"` which
  // would prevent print CSS from showing the element. Remove inline style
  // on the root clone to allow @media print rules to take effect.
  const clone = el.cloneNode(true) as HTMLElement;
  try {
    clone.removeAttribute("style");
  } catch  {
    // ignore
  }

  // Try to resolve a client-specific logo URL. Search in options, inside the
  // element (data-logo-url or img[data-logo]) or on the document. Fallback to
  // the Alma4D default logo.
  const findLogoFromRoot = (root: ParentNode | null) => {
    if (!root) return null;
    try {
      const attr = (root as Element)
        .querySelector?.("[data-logo-url]")
        ?.getAttribute("data-logo-url");
      if (attr) return attr;
      const imgData = (root as Element)
        .querySelector?.("img[data-logo]")
        ?.getAttribute("src");
      if (imgData) return imgData;
      const imgClass = (root as Element)
        .querySelector?.(".client-logo img")
        ?.getAttribute("src");
      if (imgClass) return imgClass;
    } catch {}
    return null;
  };

  const logoUrl =
    opts?.logoUrl ||
    findLogoFromRoot(el) ||
    findLogoFromRoot(document.body) ||
    "/images/alma4d-round-512.png";

  const headerHtml = `
    <div class="print-header">
      <div style="display:flex;align-items:center;gap:12px;">
        <img class="logo" src="${logoUrl}" alt="logo" />
        <div style="font-size:12px;color:#0f172a">${title}</div>
      </div>
      <div class="title">
        <div class="company">${document.title ?? "Relatório"}</div>
        <div class="meta">Emitido em ${new Date().toLocaleString()}</div>
      </div>
    </div>
  `;

  const footerHtml = `<div class="print-footer">Documento gerado pela plataforma alma4D em ${new Date().toLocaleDateString("pt-BR")}</div>`;

  const html = `<!doctype html>
  <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>${title}</title>
      ${stylesHtml}
      ${printOverrides}
    </head>
    <body>
      ${headerHtml}
      <div class="print-container">
        ${clone.outerHTML}
      </div>
      ${footerHtml}
    </body>
  </html>`;

  const win = window.open("", "_blank");
  if (!win)
    throw new Error(
      "Não foi possível abrir a janela de impressão (bloqueador de pop-ups).",
    );

  win.document.open();
  win.document.write(html);
  win.document.close();

  // Wait for fonts/images to load, but don't hang forever
  await new Promise((resolve) => {
    const done = () => resolve(null);
    let finished = false;
    const timer = setTimeout(() => {
      if (!finished) {
        finished = true;
        done();
      }
    }, timeoutMs);

    try {
      // Prefer the document load event in the new window
      win.onload = () => {
        if (!finished) {
          finished = true;
          clearTimeout(timer);
          done();
        }
      };
    } catch  {
      // ignore
    }
  });

  try {
    win.focus();
    win.print();
  } catch (e) {
    console.error("Erro ao invocar print():", e);
    throw e;
  }
}

export default printElement;
