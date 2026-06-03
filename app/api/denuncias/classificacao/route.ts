import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const NIVEIS_VALIDOS = ["alta", "media", "baixa"] as const;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { denunciaId, severidade, prioridade } = body;

    if (!denunciaId) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    if (severidade != null && !NIVEIS_VALIDOS.includes(severidade)) {
      return NextResponse.json(
        { error: "invalid_severidade" },
        { status: 400 },
      );
    }

    if (prioridade != null && !NIVEIS_VALIDOS.includes(prioridade)) {
      return NextResponse.json(
        { error: "invalid_prioridade" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("denuncias")
      .update({
        severidade: severidade ?? null,
        prioridade: prioridade ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", denunciaId);

    if (error) {
      console.error("Erro ao atualizar classificação:", error);
      return NextResponse.json(
        { error: "update_failed", detail: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erro inesperado classificação:", err);

    return NextResponse.json({ error: "unexpected_failure" }, { status: 500 });
  }
}
