import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/contratos-flow";
import { gerarContratoPdfInterno } from "@/lib/contrato-pdf";

// ✅ tipo seguro para erro
type UnknownError = {
  message?: string;
};

export async function POST(req: Request) {
  const supabase = supabaseAdmin();

  let contratoId: string | null = null;

  try {
    const body = await req.json();
    contratoId = body?.contratoId ?? null;

    if (!contratoId) {
      return NextResponse.json(
        { error: "contratoId obrigatório" },
        { status: 400 },
      );
    }

    // ✅ marcar como processing
    await supabase
      .from("contratos")
      .update({ pdf_status: "processing" })
      .eq("id", contratoId);

    // ✅ gerar PDF (Node runtime OK)
    await gerarContratoPdfInterno({
      supabase,
      contratoId,
    });

    // ✅ sucesso
    await supabase
      .from("contratos")
      .update({
        pdf_status: "done",
        pdf_generated_at: new Date().toISOString(),
        pdf_error: null,
      })
      .eq("id", contratoId);

    await supabase.from("contrato_eventos").insert({
      contrato_id: contratoId,
      tipo: "pdf_generated",
      descricao: "PDF gerado via API",
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const errorObj = err as UnknownError;
    const message = errorObj?.message ?? "Erro interno";

    console.error("[PDF API] erro:", err);
    const { data: contrato } = await supabase
      .from("contratos")
      .select("pdf_attempts")
      .eq("id", contratoId)
      .maybeSingle();

    const attempts = (contrato?.pdf_attempts ?? 0) + 1;

    if (contratoId) {
      await supabase
        .from("contratos")
        .update({
          pdf_status: "error",
          pdf_error: message,
          pdf_attempts: attempts,
        })
        .eq("id", contratoId);

      await supabase.from("contrato_eventos").insert({
        contrato_id: contratoId,
        tipo: "pdf_failed",
        descricao: message,
      });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
