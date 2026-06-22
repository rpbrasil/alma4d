import { chromium, type Browser } from "playwright";

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return String(err ?? "Unknown error");
  } catch {
    return "Unknown error";
  }
}

export async function POST(req: Request) {
  const html = await req.text();

  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: true,
    });

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "networkidle",
    });

    const pdfBuffer: Uint8Array = await page.pdf({
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

    if (!pdfBuffer || pdfBuffer.length === 0) {
      console.error("PDF generation produced empty buffer");
      return new Response(
        JSON.stringify({ error: "PDF generation failed: empty output" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Buffer (Uint8Array) -> Uint8Array (no cast needed)
    const pdfBytes = new Uint8Array(pdfBuffer);

    return new Response(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          "attachment; filename=relatorio_psicossocial.pdf",
      },
    });
  } catch (err: unknown) {
    const msg = extractErrorMessage(err);
    console.error("Error generating COPSOQ PDF:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  } finally {
    try {
      if (browser) await browser.close();
    } catch (e) {
      console.warn("Error closing Playwright browser:", e);
    }
  }
}
