import { chromium } from "playwright";

export async function POST(req: Request) {
  const html = await req.text();

  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  await page.setContent(html, {
    waitUntil: "networkidle",
  });

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: {
      top: "20mm",
      bottom: "20mm",
      left: "15mm",
      right: "15mm",
    },
    displayHeaderFooter: true,
    headerTemplate: `<div></div>`,
    footerTemplate: `
      <div style="font-size:9px;width:100%;text-align:right;padding-right:15mm;">
        Página <span class="pageNumber"></span> de <span class="totalPages"></span>
      </div>
    `,
  });

  await browser.close();

  // ✅ CONVERSÃO CORRETA: Buffer -> Uint8Array
  const pdfBytes = new Uint8Array(pdfBuffer);

  return new Response(pdfBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=relatorio_psicossocial.pdf",
    },
  });
}
