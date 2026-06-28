import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { gerarContratoPdfInterno } from "@/lib/contrato-pdf";

// tipo seguro
type UnknownError = {
  message?: string;
};

type PdfRequestBody = {
  contratoId?: string;
};

type PdfResult = {
  ok: boolean;
  pdf_url: string;
};

export async function POST(req: Request) {
  const supabase = getSupabaseAdmin();

  // Segurança: exigir header secreto do worker
  const incomingSecret =
    req.headers.get("x-pdf-worker-secret") ||
    (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "") ||
    null;

  const expectedSecret = process.env.PDF_WORKER_SECRET ?? null;
  if (!expectedSecret) {
    console.error("[PDF API] PDF_WORKER_SECRET não configurado");
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 },
    );
  }

  if (incomingSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let contratoId: string | null = null;

  try {
    // ✅ 1. parse do body protegido
    let body: PdfRequestBody | null;
    try {
      body = await req.json();
    } catch {
      throw new Error("Body inválido (JSON)");
    }

    contratoId = body?.contratoId ?? null;

    if (!contratoId) {
      return NextResponse.json(
        { error: "contratoId obrigatório" },
        { status: 400 },
      );
    }

    // ✅ 2. pegar estado atual (idempotência + controle)
    const { data: contrato, error: contratoErr } = await supabase
      .from("contratos")
      .select("pdf_status, pdf_attempts")
      .eq("id", contratoId)
      .maybeSingle();

    if (contratoErr || !contrato) {
      throw new Error("Contrato não encontrado");
    }

    // ✅ 3. evitar processamento duplicado
    if (contrato.pdf_status === "done") {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "PDF já gerado",
      });
    }

    // ✅ 4. marcar como processing (somente aqui!)
    await supabase
      .from("contratos")
      .update({ pdf_status: "processing" })
      .eq("id", contratoId);

    // ✅ 5. gerar PDF DE VERDADE
    const result = (await gerarContratoPdfInterno({
      supabase,
      contratoId,
    })) as PdfResult;

    // ✅ 6. validar resultado REAL
    if (!result || !result.pdf_url) {
      throw new Error("PDF não foi gerado corretamente (sem PDF_URL)");
    }

    // ✅ 7. salvar sucesso completo
    await supabase
      .from("contratos")
      .update({
        pdf_status: "done",
        pdf_generated_at: new Date().toISOString(),
        pdf_error: null,
        pdf_url: result.pdf_url,
      })
      .eq("id", contratoId);

    await supabase.from("contrato_eventos").insert({
      contrato_id: contratoId,
      tipo: "pdf_generated",
      descricao: "PDF gerado com sucesso",
      dados: {
        pdf_url: result.pdf_url,
      },
    });

    return NextResponse.json({
      ok: true,
      pdf_url: result.pdf_url,
    });
  } catch (err: unknown) {
    const errorObj = err as UnknownError;
    const message = errorObj?.message ?? "Erro interno";

    console.error("[PDF API] erro:", err);

    if (contratoId) {
      // ✅ pegar attempts atual
      const { data: contrato } = await supabase
        .from("contratos")
        .select("pdf_attempts")
        .eq("id", contratoId)
        .maybeSingle();

      const attempts = (contrato?.pdf_attempts ?? 0) + 1;

      // ✅ salvar erro corretamente
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
