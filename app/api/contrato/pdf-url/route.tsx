import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const contratoId = searchParams.get("contratoId");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: contrato } = await supabase
    .from("contratos")
    .select("pdf_url")
    .eq("id", contratoId)
    .single();

  if (!contrato?.pdf_url) {
    return NextResponse.json({ error: "PDF não encontrado" }, { status: 404 });
  }

  const { data } = await supabase.storage
    .from("contratos")
    .createSignedUrl(contrato.pdf_url, 60); // 60s

  return NextResponse.json({ url: data?.signedUrl });
}
