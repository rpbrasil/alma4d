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
  razao_social: string | null;
  cnpj: string | null;
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
    .select("razao_social, cnpj")
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

  // 5) Hash simples por enquanto
  // Depois você pode trocar por SHA256 real
  const hash = `${contratoRow.id}-${contratoPdf.versao}-${contratoPdf.dataAceite}`;

  // // 6) QR Code de validação
  const verifyUrl = `${process.env.BASE_URL}/contrato/validar/${contratoId}`;
  const qrCode = await QRCode.toDataURL(verifyUrl);

  // 7) Renderizar PDF
  // ✅ gerar HTML com seu template real
  const html = generateContratoHTML({
    empresa: {
      razaoSocial: clienteRow.razao_social ?? "",
      cnpj: clienteRow.cnpj ?? "",
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
    termosHtml: "", // você pode conectar depois
    privacidadeHtml: "",
    hash,
    qrCode, // passa o QR code para o template
  });

  // ✅ iniciar browser
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  // ✅ criar página
  const page = await browser.newPage();

  // ✅ carregar HTML
  await page.setContent(html, {
    waitUntil: "load",
  });

  // ✅ gerar PDF
  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: {
      top: "20mm",
      bottom: "20mm",
      left: "15mm",
      right: "15mm",
    },
  });

  // ✅ fechar browser
  await browser.close();

  // 8) Caminho no bucket
  const filePath = `clientes/${contratoRow.cliente_id}/contratos/${contratoRow.id}/v${contratoPdf.versao}/contrato-gerado.pdf`;

  console.log("[PDF] Upload:", filePath);

  const { error: uploadError } = await supabase.storage
    .from("contratos")
    .upload(filePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    console.error("[PDF] ❌ upload falhou:", uploadError.message);
    throw new Error(uploadError.message);
  }

  // 9) Atualizar contrato com path do PDF
  const { error: updateError } = await supabase
    .from("contratos")
    .update({
      pdf_url: filePath,
    })
    .eq("id", contratoId);

  if (updateError) {
    console.error("[PDF] ❌ falha ao atualizar contrato:", updateError.message);
    throw new Error(updateError.message);
  }

  // 10) Registrar evento (não quebra geração se falhar)
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
  };
}
