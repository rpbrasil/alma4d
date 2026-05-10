import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const contratoId = searchParams.get("contratoId");

    // ✅ validação
    if (!contratoId) {
      return NextResponse.json(
        { error: "contratoId obrigatório" },
        { status: 400 },
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!,
    );

    // ✅ buscar contrato
    const { data: contrato, error } = await supabase
      .from("contratos")
      .select("pdf_url")
      .eq("id", contratoId)
      .single();

    if (error) {
      console.error("Erro Supabase:", error);
      return NextResponse.json(
        { error: "Erro ao buscar contrato" },
        { status: 500 },
      );
    }

    if (!contrato?.pdf_url) {
      return NextResponse.json(
        { error: "PDF ainda não gerado" },
        { status: 404 },
      );
    }

    console.log("PDF PATH:", contrato.pdf_url);

    // ✅ gerar signed URL
    const { data, error: urlError } = await supabase.storage
      .from("contratos")
      .createSignedUrl(contrato.pdf_url, 60);

    if (urlError || !data?.signedUrl) {
      console.error("Erro signed URL:", urlError);
      return NextResponse.json(
        { error: "Erro ao gerar URL do PDF" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      url: data.signedUrl,
    });
  } catch (err) {
    console.error("Erro geral:", err);

    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
