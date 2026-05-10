import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@supabase/supabase-js";
import { ContratoNR1PDF } from "@/lib/pdf/contratoNR1";
import QRCode from "qrcode";

export async function POST(req: Request) {
  // ✅ 1. PEGAR BODY FORA DO TRY
  const body = await req.json();
  const { contratoId, empresa, usuario, contrato, hash } = body;

  if (!contratoId || !empresa || !usuario || !contrato || !hash) {
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
    const pdfBuffer = await renderToBuffer(pdfElement);

    // ✅ 5. SUPABASE
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!,
    );

    const fileName = `contratos/${contrato.numero}-v${contrato.versao}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from("contratos")
      .upload(fileName, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { error: updateError } = await supabase
      .from("contratos")
      .update({
        pdf_url: fileName,
      })
      .eq("id", contratoId);

    if (updateError) throw updateError;

    await supabase.from("contrato_eventos").insert({
      contrato_id: contratoId,
      tipo: "pdf_gerado",
      descricao: "PDF do contrato gerado e armazenado",
      dados: { fileName },
    });

    return NextResponse.json({
      ok: true,
      pdf_url: fileName,
    });
  } catch (err) {
    console.error("Erro geral contrato:", err);

    return NextResponse.json(
      { error: "Erro ao gerar contrato" },
      { status: 500 },
    );
  }
}
