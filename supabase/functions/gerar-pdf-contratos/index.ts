import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


// ✅ TIPO SEGURO PARA ERROS
type UnknownError = {
  message?: string;
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async () => {
  try {
    // ✅ 1. buscar contratos pendentes
    const { data: contratos } = await supabase
      .from("contratos")
      .select("id, pdf_attempts")
      .in("pdf_status", ["pending", "error"])
      .lt("pdf_attempts", 3)
      .limit(5);

    for (const contrato of contratos ?? []) {
      const contratoId = contrato.id;

      try {
        // ✅ 2. marcar como processing
        await supabase
          .from("contratos")
          .update({ pdf_status: "processing" })
          .eq("id", contratoId);

        // ✅ 3. gerar PDF (sem variável não usada)
        await fetch("https://alma4d.com.br/api/contrato/pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contratoId }),
        });

        // ✅ 4. salvar sucesso
        await supabase
          .from("contratos")
          .update({
            pdf_status: "done",
            pdf_generated_at: new Date().toISOString(),
            pdf_error: null,
          })
          .eq("id", contratoId);

        // ✅ evento sucesso
        await supabase.from("contrato_eventos").insert({
          contrato_id: contratoId,
          tipo: "pdf_generated",
          descricao: "PDF gerado com sucesso",
        });
      } catch (err: unknown) {
        const errorObj = err as UnknownError;

        console.error("Erro ao gerar PDF:", err);

        // ✅ salvar erro
        await supabase
          .from("contratos")
          .update({
            pdf_status: "error",
            pdf_error: errorObj?.message ?? "Erro desconhecido",
            pdf_attempts: (contrato.pdf_attempts ?? 0) + 1,
          })
          .eq("id", contratoId);

        await supabase.from("contrato_eventos").insert({
          contrato_id: contratoId,
          tipo: "pdf_failed",
          descricao: errorObj?.message ?? "Erro desconhecido",
        });
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
    });
  } catch (err: unknown) {
    const errorObj = err as UnknownError;

    return new Response(
      JSON.stringify({
        error: errorObj?.message ?? "Erro interno",
      }),
      {
        status: 500,
      },
    );
  }
});
