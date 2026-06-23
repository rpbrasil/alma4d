export async function printElement(
  el: HTMLElement | null,
  opts?: { title?: string; timeoutMs?: number },
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
    <style>
      @page { size: A4 portrait; margin: 12mm; }
      html,body { -webkit-print-color-adjust: exact; color-adjust: exact; }
      body { font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; color: #0f172a; font-size: 12px; line-height: 1.45; }
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

      /* Header / Footer */
      .print-header { position: fixed; top: 6mm; left: 12mm; right: 12mm; height: 32mm; display:flex; align-items:center; justify-content:space-between; gap:12px; }
      .print-header .logo { width: 48px; height: 48px; object-fit:contain; }
      .print-header .title { display:flex; flex-direction:column; align-items:flex-end; gap:2px; }
      .print-header .title .company { font-weight:600; font-size:13px; color:#0f172a; }
      .print-header .title .meta { font-size:11px; color:#475569; }

      .print-footer { position: fixed; bottom: 8mm; left: 12mm; right: 12mm; font-size: 10px; color: #6b7280; text-align: center; }

      /* Content container to avoid overlap with fixed header/footer */
      .print-container { max-width: 794px; margin: 0 auto; padding-top: 44mm; padding-bottom: 18mm; }

      /* Improve chart/table scaling */
      .chart, .report-table { width: 100% !important; }
    </style>
  `;

  // Clone the element to avoid copying inline `style="display:none"` which
  // would prevent print CSS from showing the element. Remove inline style
  // on the root clone to allow @media print rules to take effect.
  const clone = el.cloneNode(true) as HTMLElement;
  try {
    clone.removeAttribute("style");
  } catch (e) {
    // ignore
  }

  const headerHtml = `
    <div class="print-header">
      <div style="display:flex;align-items:center;gap:12px;">
        <img class="logo" src="/images/alma4d-round-512.png" alt="logo" />
        <div style="font-size:12px;color:#0f172a">${title}</div>
      </div>
      <div class="title">
        <div class="company">${document.title ?? "Relatório"}</div>
        <div class="meta">Emitido em ${new Date().toLocaleString()}</div>
      </div>
    </div>
  `;

  const footerHtml = `<div class="print-footer">Documento gerado pelo sistema — Alma4D</div>`;

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
    } catch (e) {
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
