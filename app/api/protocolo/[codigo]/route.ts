import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ codigo: string }> },
) {
  try {
    const { codigo } = await params;

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("denuncias")
      .select("protocolo, status, updated_at")
      .eq("protocolo", codigo)
      .maybeSingle(); // 👈 importante

    if (error) {
      console.error("Erro consulta protocolo:", error);
      return NextResponse.json({ error: "query_failed" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({
      protocolo: data.protocolo,
      status: data.status,
      updated_at: data.updated_at,
    });
  } catch (err) {
    console.error("Erro inesperado protocolo:", err);

    return NextResponse.json({ error: "unexpected_failure" }, { status: 500 });
  }
}
