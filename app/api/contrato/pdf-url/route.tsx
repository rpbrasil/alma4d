import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function normalizePdfReference(value: string | null): string | null {
  if (!value) return null;

  try {
    const parsed = new URL(value);
    const pathSegments = parsed.pathname.split("/");
    const signIndex = pathSegments.findIndex((segment) => segment === "sign");

    if (signIndex >= 0 && pathSegments.length > signIndex + 2) {
      const objectPath = pathSegments.slice(signIndex + 2).join("/");
      return decodeURIComponent(objectPath);
    }

    return value;
  } catch {
    return value;
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const contratoId = searchParams.get("contratoId");

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

    // Buscar contrato com todos os campos relevantes
    const { data: contrato, error } = await supabase
      .from("contratos")
      .select("id, numero_contrato, pdf_url, pdf_assinado_url, status")
      .eq("id", contratoId)
      .single();

    if (error || !contrato) {
      console.error("[PDF-URL] Contrato não encontrado:", {
        contratoId,
        error: error?.message,
      });
      return NextResponse.json(
        {
          error: "Contrato não encontrado",
          debug: { contratoId, supabaseError: error?.message },
        },
        { status: 404 },
      );
    }

    // Verificar qual campo tem o PDF
    const rawPdfPath = contrato.pdf_assinado_url || contrato.pdf_url || null;
    const pdfPath = normalizePdfReference(rawPdfPath);

    console.log("[PDF-URL] Debug info:", {
      contratoId,
      numero_contrato: contrato.numero_contrato,
      status: contrato.status,
      has_pdf_assinado: !!contrato.pdf_assinado_url,
      has_pdf_url: !!contrato.pdf_url,
      rawPdfPath,
      pdfPath,
      will_use: pdfPath ? "✓" : "✗",
    });

    if (!pdfPath) {
      return NextResponse.json(
        {
          error: "PDF não foi gerado ainda",
          debug: {
            contrato_id: contratoId,
            numero_contrato: contrato.numero_contrato,
            status: contrato.status,
            msg: "Aguarde a geração do PDF após confirmação de pagamento",
          },
        },
        { status: 404 },
      );
    }

    // Tentar gerar signed URL
    try {
      const { data, error: urlError } = await supabase.storage
        .from("contratos")
        .createSignedUrl(pdfPath, 3600); // 1 hora em vez de 60 segundos

      if (urlError) {
        console.error("[PDF-URL] createSignedUrl error:", {
          pdfPath,
          error: urlError.message,
          status: urlError.status,
        });

        return NextResponse.json(
          {
            error: "Erro ao gerar URL assinada do PDF",
            debug: {
              pdfPath,
              storageError: urlError.message,
            },
          },
          { status: 500 },
        );
      }

      if (!data?.signedUrl) {
        console.error("[PDF-URL] signedUrl vazia:", { pdfPath, data });
        return NextResponse.json(
          {
            error: "URL assinada não foi gerada corretamente",
            debug: { pdfPath },
          },
          { status: 500 },
        );
      }

      console.log("[PDF-URL] Success:", {
        contratoId,
        pdfPath: pdfPath.substring(0, 50) + "...",
      });
      return NextResponse.json({
        url: data.signedUrl,
      });
    } catch (storageErr) {
      console.error("[PDF-URL] Storage exception:", {
        error:
          storageErr instanceof Error ? storageErr.message : String(storageErr),
        pdfPath,
      });

      return NextResponse.json(
        {
          error: "Erro ao processar armazenamento",
          debug: {
            msg:
              storageErr instanceof Error
                ? storageErr.message
                : "Unknown error",
            pdfPath,
          },
        },
        { status: 500 },
      );
    }
  } catch (err) {
    console.error("[PDF-URL] General error:", {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });

    return NextResponse.json(
      {
        error: "Erro interno ao gerar URL do PDF",
        debug: {
          msg: err instanceof Error ? err.message : "Unknown error",
        },
      },
      { status: 500 },
    );
  }
}
