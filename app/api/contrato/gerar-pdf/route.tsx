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
  const qrCode = await QRCode.toDataURL(
    `${process.env.BASE_URL}/contrato/${contratoId}`,
  );

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
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const fileName = `contratos/${contrato.numero}-v${contrato.versao}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from("contratos")
      .upload(fileName, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data, error: signedUrlError } = await supabase.storage
      .from("contratos")
      .createSignedUrl(fileName, 60 * 60 * 24 * 30);

    if (signedUrlError) throw signedUrlError;

    const { error: updateError } = await supabase
      .from("contratos")
      .update({
        pdf_url: data?.signedUrl,
      })
      .eq("id", contratoId);

    if (updateError) throw updateError;

    return NextResponse.json({
      ok: true,
      pdf_url: data?.signedUrl,
    });
  } catch (err) {
    console.error("Erro geral contrato:", err);

    return NextResponse.json(
      { error: "Erro ao gerar contrato" },
      { status: 500 },
    );
  }
}
