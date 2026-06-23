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
      @page { size: A4; margin: 14mm; }
      html,body { -webkit-print-color-adjust: exact; color-adjust: exact; }
      body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; color: #111; }
      .no-print { display: none !important; }
      img { max-width: 100%; height: auto; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; page-break-after: auto; }
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
      .page-break { page-break-after: always; break-after: page; }
      * { box-sizing: border-box; }
    </style>
  `;

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
      ${el.outerHTML}
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
