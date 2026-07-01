import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import QRCode from "qrcode";
import puppeteer from "puppeteer";
import { generateContratoHTML } from "@/lib/contratoTemplate";

type ContratoDb = {
  id: string;
  cliente_id: string;
  criado_por: string | null;
  numero_contrato: string | null;
  versao: number | null;
  aceite_termos_em: string | null;
  aceite_ip: string | null;
  aceite_user_agent: string | null;
  pdf_url: string | null;
};

type ClienteDb = {
  nome: string | null;
  documento: string | null;
};

type UsuarioDb = {
  nome_completo: string | null;
  email: string | null;
  documento: string | null;
};

export async function gerarContratoPdfInterno({
  supabase,
  contratoId,
}: {
  supabase: SupabaseClient;
  contratoId: string;
}) {
  console.log("[PDF] Iniciando geração:", contratoId);

  // 1) Buscar contrato
  const { data: contratoRow, error: contratoError } = await supabase
    .from("contratos")
    .select(
      "id, cliente_id, criado_por, numero_contrato, versao, aceite_termos_em, aceite_ip, aceite_user_agent, pdf_url",
    )
    .eq("id", contratoId)
    .single<ContratoDb>();

  if (contratoError || !contratoRow) {
    throw new Error(
      contratoError?.message ?? "Contrato não encontrado para gerar PDF",
    );
  }

  // 2) Buscar cliente
  const { data: clienteRow, error: clienteError } = await supabase
    .from("clientes")
    .select("nome, documento")
    .eq("id", contratoRow.cliente_id)
    .single<ClienteDb>();

  if (clienteError || !clienteRow) {
    throw new Error(
      clienteError?.message ?? "Cliente não encontrado para gerar PDF",
    );
  }

  // 3) Buscar usuário responsável
  // Se criado_por estiver nulo, ainda gera o PDF com campos vazios
  let usuarioRow: UsuarioDb | null = null;

  if (contratoRow.criado_por) {
    const { data, error } = await supabase
      .from("usuarios")
      .select("nome_completo, email, documento")
      .eq("id", contratoRow.criado_por)
      .single<UsuarioDb>();

    if (error) {
      throw new Error(
        error.message ?? "Usuário responsável não encontrado para gerar PDF",
      );
    }

    usuarioRow = data;
  }

  // 4) Estrutura que o componente PDF espera
  const contratoPdf = {
    numero: contratoRow.numero_contrato ?? "",
    versao: contratoRow.versao ?? 1,
    dataAceite: contratoRow.aceite_termos_em ?? new Date().toISOString(),
    ip: contratoRow.aceite_ip ?? "",
    userAgent: contratoRow.aceite_user_agent ?? "",
  };

  // 5) QR Code de validação — URL pública, sem autenticação necessária
  const baseUrl =
    process.env.PDF_BASE_URL ?? process.env.BASE_URL ?? "https://alma4d.com.br";
  const verifyUrl = `${baseUrl}/contrato/validar/${contratoId}`;
  const qrCode = await QRCode.toDataURL(verifyUrl);

  // 6) SHA256 do conteúdo do contrato
  //    Passo 1: gerar HTML sem hash → computar digest → gerar HTML final com hash real
  const templateParams = {
    empresa: {
      razaoSocial: clienteRow.nome ?? "",
      cnpj: clienteRow.documento ?? "",
    },
    usuario: {
      nome: usuarioRow?.nome_completo ?? "",
      email: usuarioRow?.email ?? "",
      documento: usuarioRow?.documento ?? "",
    },
    contrato: {
      numero: contratoRow.numero_contrato ?? "",
      versao: contratoRow.versao ?? 1,
      dataAceite: contratoRow.aceite_termos_em ?? "",
      ip: contratoRow.aceite_ip ?? "",
      userAgent: contratoRow.aceite_user_agent ?? "",
    },
    termosHtml: "",
    privacidadeHtml: "",
    qrCode,
    isDefinitive: true,
  };

  const htmlSemHash = generateContratoHTML({ ...templateParams, hash: "" });
  const hash = createHash("sha256").update(htmlSemHash, "utf8").digest("hex");

  // 7) HTML final com SHA256 real embutido
  const html = generateContratoHTML({ ...templateParams, hash });

  // ✅ iniciar browser
  const browser = await puppeteer.launch({
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  });

  let pdfBuffer: Uint8Array;

  try {
    const page = await browser.newPage();

    // Block external network requests — the HTML must be self-contained.
    // Only data: URIs (e.g. embedded QR code) and the initial blank page are allowed.
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      const url = request.url();
      if (url.startsWith("data:") || url === "about:blank") {
        request.continue();
      } else {
        request.abort();
      }
    });

    await page.setContent(html, { waitUntil: "load", timeout: 30_000 });
    // best-effort idle wait; external requests are already blocked so this resolves quickly
    await page.waitForNetworkIdle({ timeout: 5_000 }).catch(() => {});

    pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        bottom: "20mm",
        left: "15mm",
        right: "15mm",
      },
    });

    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error("PDF gerado está vazio");
    }
  } finally {
    await browser.close();
  }

  // 8) Caminho no bucket
  const filePath = `clientes/${contratoRow.cliente_id}/contratos/${contratoRow.id}/v${contratoPdf.versao}/contrato-gerado.pdf`;

  console.log("[PDF] Upload:", filePath);

  const { error: uploadError } = await supabase.storage
    .from("contratos")
    .upload(filePath, Buffer.from(pdfBuffer), {
      contentType: "application/pdf",
      upsert: true, // allows safe retries when a previous upload succeeded but the DB update failed
    });

  if (uploadError) {
    console.error("[PDF] ❌ upload falhou:", uploadError.message);
    throw new Error(uploadError.message);
  }

  // 9) Registrar evento (não quebra geração se falhar)
  // O chamador (pdf/route.tsx) é responsável por atualizar pdf_url, pdf_status e pdf_generated_at
  // num único UPDATE atômico após esta função retornar com sucesso.
  const { error: eventoError } = await supabase
    .from("contrato_eventos")
    .insert({
      contrato_id: contratoId,
      tipo: "pdf_gerado",
      descricao: "PDF do contrato gerado automaticamente",
      dados: { filePath },
    });

  if (eventoError) {
    console.warn("[PDF] Falha ao registrar evento:", eventoError.message);
  }

  console.log("[PDF] ✅ Concluído com sucesso:", {
    contratoId,
    pdf_url: filePath,
  });

  return {
    ok: true,
    pdf_url: filePath,
  } as const;
}
