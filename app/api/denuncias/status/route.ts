import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const STATUS_VALIDOS = [
  "recebida",
  "em_analise",
  "em_tratamento",
  "resolvida",
  "encerrada",
  "descartada",
] as const;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { denunciaId, status } = body;

    if (!denunciaId || !status) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    if (!STATUS_VALIDOS.includes(status)) {
      return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin(); // 🔥 chave aqui

    const { error } = await supabase
      .from("denuncias")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", denunciaId);

    if (error) {
      console.error("Erro ao atualizar status:", error);

      return NextResponse.json(
        { error: "update_failed", detail: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erro inesperado status:", err);

    return NextResponse.json({ error: "unexpected_failure" }, { status: 500 });
  }
}