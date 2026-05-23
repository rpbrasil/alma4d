// supabase/functions/_shared/emailTemplates.ts

export type PaymentEmailVars = {
  nome: string;
  numeroContrato?: string | null;
  metodo?: string | null; // "pix" | "boleto" etc.

  // links dinâmicos
  dashboardUrl: string;
  expressUrl: string;

  // opcional: link do contrato (PDF)
  contratoUrl?: string | null; // pdf_assinado_url ou pdf_url
};

export type NfseEmailVars = {
  nome: string;
  ref: string;

  // links dinâmicos (se você tiver)
  nfsePdfUrl?: string | null;
  nfseXmlUrl?: string | null;
};

function esc(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/** Botão primário padrão */
function primaryButton(url: string, label: string) {
  const u = esc(url);
  const l = esc(label);
  const style =
    "display:inline-block;background:#019499;color:#fff;text-decoration:none;" +
    "padding:12px 18px;border-radius:8px;font-weight:700;";
  return `<a href="${u}" style="${style}">${l}</a>`;
}

/** Botão secundário padrão */
function secondaryButton(url: string, label: string) {
  const u = esc(url);
  const l = esc(label);
  const style =
    "display:inline-block;background:#ffffff;color:#019499;text-decoration:none;" +
    "padding:10px 16px;border-radius:8px;border:1px solid #cfe8e8;font-weight:700;";
  return `<a href="${u}" style="${style}">${l}</a>`;
}

/** ✅ Template 1: Pagamento confirmado (email principal) */
export function paymentConfirmedTemplate(v: PaymentEmailVars) {
  const nome = esc(v.nome || "Cliente");
  const numeroContrato = v.numeroContrato ? esc(v.numeroContrato) : "—";
  const metodo = v.metodo ? esc(v.metodo.toUpperCase()) : "—";

  const dashboardBtn = primaryButton(v.dashboardUrl, "Acessar Dashboard");
  const expressBtn = secondaryButton(v.expressUrl, "Acessar Express");

  const contratoLink = v.contratoUrl
    ? `<p style="margin:10px 0 0 0;">📄 Contrato: <a href="${esc(
        v.contratoUrl,
      )}" style="color:#019499;text-decoration:none;font-weight:700;">abrir PDF</a></p>`
    : `<p style="margin:10px 0 0 0;color:#475569;">📄 Seu contrato está sendo gerado e ficará disponível em instantes.</p>`;

  return {
    subject: "Pagamento confirmado ✅ Seu acesso foi liberado",
    html: `
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:24px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0"
      style="background:#ffffff;border-radius:10px;font-family:Arial,Helvetica,sans-serif;">
      <tr>
        <td align="center" style="padding:24px;">
          <img src="https://alma4d.com.br/images/alma4d-bicolor-nobground-256.webp"
               width="92" alt="alma4D" style="display:block;border:0;" />
        </td>
      </tr>

      <tr>
        <td style="padding:28px 32px;color:#1f2937;">
          <h2 style="margin:0 0 12px 0;color:#019499;">Pagamento confirmado ✅</h2>
          <p style="margin:0 0 14px 0;">Olá <strong>${nome}</strong>,</p>
          <p style="margin:0 0 14px 0;">
            Seu pagamento foi confirmado e seu acesso já está liberado.
          </p>

          <div style="background:#f8fafc;border:1px solid #eef2f7;border-radius:10px;padding:14px 16px;margin:18px 0;">
            <div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;">Resumo</div>
            <div style="margin-top:8px;font-size:14px;">
              <div><strong>Contrato:</strong> ${numeroContrato}</div>
              <div><strong>Método:</strong> ${metodo}</div>
            </div>
          </div>

          <div style="text-align:center;margin:18px 0 10px 0;">
            ${dashboardBtn}
          </div>
          <div style="text-align:center;margin:0 0 18px 0;">
            ${expressBtn}
          </div>

          <hr style="margin:18px 0;border:none;border-top:1px solid #e5e7eb;" />

          ${contratoLink}

          <p style="margin:10px 0 0 0;color:#475569;">
            🧾 A nota fiscal (NFSe) será enviada assim que for autorizada pela prefeitura.
          </p>

          <p style="margin-top:22px;color:#6b7280;font-size:12px;">
            Se tiver dúvidas, responda este e-mail.
          </p>
        </td>
      </tr>

      <tr>
        <td style="padding:18px;text-align:center;font-size:12px;color:#94a3b8;">
          alma4D • voss.digital
        </td>
      </tr>
    </table>
  </td></tr>
</table>
`,
  };
}

/** ✅ Template 2: NFSe autorizada (email fiscal) */
export function nfseAuthorizedTemplate(v: NfseEmailVars) {
  const nome = esc(v.nome || "Cliente");
  const ref = esc(v.ref);

  const pdfBtn = v.nfsePdfUrl
    ? primaryButton(v.nfsePdfUrl, "Baixar NFSe (PDF)")
    : "";
  const xmlBtn = v.nfseXmlUrl
    ? secondaryButton(v.nfseXmlUrl, "Baixar XML")
    : "";

  const fallback =
    !v.nfsePdfUrl && !v.nfseXmlUrl
      ? `<p style="color:#475569;">Os links do PDF/XML ainda não estão disponíveis. Você pode tentar novamente em alguns instantes.</p>`
      : "";

  return {
    subject: "Nota fiscal emitida ✅ (NFSe autorizada)",
    html: `
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:24px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0"
      style="background:#ffffff;border-radius:10px;font-family:Arial,Helvetica,sans-serif;">
      <tr>
        <td align="center" style="padding:24px;">
          <img src="https://alma4d.com.br/images/alma4d-bicolor-nobground-256.webp"
               width="92" alt="alma4D" style="display:block;border:0;" />
        </td>
      </tr>

      <tr>
        <td style="padding:28px 32px;color:#1f2937;">
          <h2 style="margin:0 0 12px 0;color:#019499;">Nota fiscal emitida ✅</h2>
          <p style="margin:0 0 14px 0;">Olá <strong>${nome}</strong>,</p>
          <p style="margin:0 0 14px 0;">
            Sua NFSe foi autorizada com sucesso. Referência: <strong>${ref}</strong>.
          </p>

          <div style="text-align:center;margin:18px 0 10px 0;">
            ${pdfBtn || ""}
          </div>

          <div style="text-align:center;margin:0 0 18px 0;">
            ${xmlBtn || ""}
          </div>

          ${fallback}

          <p style="margin-top:22px;color:#6b7280;font-size:12px;">
            Se precisar de ajuda, responda este e-mail.
          </p>
        </td>
      </tr>

      <tr>
        <td style="padding:18px;text-align:center;font-size:12px;color:#94a3b8;">
          alma4D • voss.digital
        </td>
      </tr>
    </table>
  </td></tr>
</table>
`,
  };
}
