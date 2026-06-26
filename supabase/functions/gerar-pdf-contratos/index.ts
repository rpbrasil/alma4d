import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ✅ tipo seguro
type UnknownError = {
  message?: string;
};
type PdfApiResponse = {
  ok?: boolean;
  url?: string;
  error?: string;
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req: Request) => {
  // auth: accept either internal secret header or service role bearer
  const internalSecretHeader = req.headers.get("x-internal-secret");
  const authHeader =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  const INTERNAL_API_SECRET = Deno.env.get("INTERNAL_API_SECRET");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const internalOk =
    INTERNAL_API_SECRET &&
    internalSecretHeader &&
    internalSecretHeader === INTERNAL_API_SECRET;
  const serviceOk = SERVICE_ROLE && authHeader && authHeader === SERVICE_ROLE;
  if (!internalOk && !serviceOk) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401,
    });
  }

  try {
    // ✅ 1. buscar contratos elegíveis
    const { data: contratos } = await supabase
      .from("contratos")
      .select("id, pdf_attempts, pdf_status")
      .in("pdf_status", ["pending", "error"])
      .lt("pdf_attempts", 3)
      .limit(5);

    for (const contrato of contratos ?? []) {
      const contratoId = contrato.id;

      try {
        // ✅ 2. evitar reprocessar status inválido
        if (contrato.pdf_status === "done") continue;

        // ✅ 3. marcar processamento (leve, opcional)
        await supabase
          .from("contratos")
          .update({ pdf_status: "processing" })
          .eq("id", contratoId);

        // ✅ 4. chamar API (autenticado com secret do worker)
        const pdfSecret = Deno.env.get("PDF_WORKER_SECRET");
        if (!pdfSecret) {
          throw new Error("PDF_WORKER_SECRET ausente");
        }

        const res = await fetch("https://alma4d.com.br/api/contrato/pdf", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-pdf-worker-secret": pdfSecret,
          },
          body: JSON.stringify({ contratoId }),
        });

        // ✅ 5. validar resposta HTTP
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`PDF API failed: ${text}`);
        }

        // ✅ 6. validar JSON seguro
        let data: PdfApiResponse | null = null;
        try {
          data = (await res.json()) as PdfApiResponse;
        } catch {
          throw new Error("Resposta inválida da API de PDF");
        }

        // ✅ 7. validar retorno real
        if (!data?.url) {
          throw new Error("API não retornou URL do PDF");
        }

        // ✅ 8. ✅ NÃO atualiza status aqui (API já faz isso)
      } catch (err: unknown) {
        const errorObj = err as UnknownError;

        console.error("[PDF EDGE] erro:", err);

        // ✅ incrementar tentativa com leitura fresca do DB (evita stale count se outro processo já incrementou)
        const { data: freshContrato } = await supabase
          .from("contratos")
          .select("pdf_attempts")
          .eq("id", contratoId)
          .maybeSingle();

        const attempts = (freshContrato?.pdf_attempts ?? 0) + 1;

        await supabase
          .from("contratos")
          .update({
            pdf_status: "error",
            pdf_error: errorObj?.message ?? "Erro desconhecido",
            pdf_attempts: attempts,
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
      { status: 500 },
    );
  }
});
