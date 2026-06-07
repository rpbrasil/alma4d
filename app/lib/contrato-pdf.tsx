import type { SupabaseClient } from "@supabase/supabase-js";
import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { ContratoNR1PDF } from "@/lib/pdf/contratoNR1";

type ContratoDb = {
  id: string;
  cliente_id: string;
  criado_por: string | null;
  numero_contrato: string | null;
  versao: number | null;
  aceite_termos_em: string | null;
  ip_aceite: string | null;
  user_agent: string | null;
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
      "id, cliente_id, criado_por, numero_contrato, versao, data_aceite_termos, ip_aceite, user_agent, pdf_url",
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
    ip: contratoRow.ip_aceite ?? "",
    userAgent: contratoRow.user_agent ?? "",
  };

  // 5) Hash simples por enquanto
  // Depois você pode trocar por SHA256 real
  const hash = `${contratoRow.id}-${contratoPdf.versao}-${contratoPdf.dataAceite}`;

  // 6) QR Code de validação
  const verifyUrl = `${process.env.BASE_URL}/contrato/${contratoId}`;
  const qrCode = await QRCode.toDataURL(verifyUrl);

  // 7) Renderizar PDF
  const pdfElement = (
    <ContratoNR1PDF
      empresa={{
        razaoSocial: clienteRow.razao_social ?? "",
        cnpj: clienteRow.cnpj ?? "",
      }}
      usuario={{
        nome: usuarioRow?.nome_completo ?? "",
        email: usuarioRow?.email ?? "",
        documento: usuarioRow?.documento ?? "",
      }}
      contrato={contratoPdf}
      hash={hash}
      qrCode={qrCode}
    />
  );

  const pdfBuffer = await renderToBuffer(pdfElement);

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
