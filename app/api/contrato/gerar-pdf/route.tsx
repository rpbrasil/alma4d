import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ContratoNR1PDF } from "@/lib/pdf/contratoNR1";
import QRCode from "qrcode";

export async function POST(req: Request) {
  // ✅ 1. PEGAR BODY FORA DO TRY
  const body = await req.json();
  const { contratoId, empresa, usuario, contrato, hash } = body;

  console.log("[GERAR-PDF] Iniciando geração de PDF:", {
    contratoId,
    cliente_id: contrato?.cliente_id,
    numero_contrato: contrato?.numero_contrato,
  });

  if (!contratoId || !empresa || !usuario || !contrato || !hash) {
    console.error("[GERAR-PDF] Dados incompletos:", {
      contratoId: !!contratoId,
      empresa: !!empresa,
      usuario: !!usuario,
      contrato: !!contrato,
      hash: !!hash,
    });
    return NextResponse.json(
      { error: "Dados incompletos para gerar contrato" },
      { status: 400 },
    );
  }

  // ✅ 2. GERAR QR CODE FORA DO TRY
  const verifyUrl = `${process.env.BASE_URL}/contrato/${contratoId}`;
  const qrCode = await QRCode.toDataURL(verifyUrl);

  // ✅ 3. CRIAR JSX FORA DO TRY (ESSA É A CHAVE 🔥)
  const pdfElement = (
    <ContratoNR1PDF
      empresa={empresa}
      usuario={usuario}
      contrato={contrato}
      hash={hash}
      qrCode={qrCode}
    />
  );

  try {
    // ✅ 4. GERAR PDF
    console.log("[GERAR-PDF] Renderizando buffer de PDF...");
    const pdfBuffer = await renderToBuffer(pdfElement);
    console.log("[GERAR-PDF] PDF renderizado:", {
      tamanho: pdfBuffer.length,
      unidade: "bytes",
    });

    // ✅ 5. SUPABASE
    const supabase = getSupabaseAdmin();

    const fileName = `clientes/${contrato.cliente_id}/contratos/${contrato.id}/v${contrato.versao}/contrato-gerado.pdf`;

    console.log("[GERAR-PDF] Fazendo upload para Supabase Storage:", {
      fileName,
      bucket: "contratos",
    });

    const { error: uploadError } = await supabase.storage
      .from("contratos")
      .upload(fileName, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("[GERAR-PDF] Erro no upload:", uploadError);
      throw uploadError;
    }

    console.log(
      "[GERAR-PDF] Upload bem-sucedido, atualizando banco de dados...",
    );

    const { error: updateError } = await supabase
      .from("contratos")
      .update({
        pdf_url: fileName,
      })
      .eq("id", contratoId);

    if (updateError) {
      console.error("[GERAR-PDF] Erro ao atualizar banco:", updateError);
      throw updateError;
    }

    console.log("[GERAR-PDF] Banco de dados atualizado, registrando evento...");

    await supabase.from("contrato_eventos").insert({
      contrato_id: contratoId,
      tipo: "pdf_gerado",
      descricao: "PDF do contrato gerado e armazenado",
      dados: { fileName },
    });

    console.log("[GERAR-PDF] ✓ Geração concluída com sucesso", {
      contratoId,
      pdf_url: fileName,
    });

    return NextResponse.json({
      ok: true,
      pdf_url: fileName,
    });
  } catch (err) {
    console.error("[GERAR-PDF] Erro geral:", {
      contratoId,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });

    return NextResponse.json(
      {
        error: "Erro ao gerar contrato",
        debug: {
          msg: err instanceof Error ? err.message : "Erro desconhecido",
        },
      },
      { status: 500 },
    );
  }
}
