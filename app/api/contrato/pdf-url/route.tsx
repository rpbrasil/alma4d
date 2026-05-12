import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Normaliza referências de PDF para extrair o caminho correto do Supabase Storage.
 * Suporta:
 * 1. URLs assinadas do Supabase (com /sign/)
 * 2. Caminhos relativos simples (clientes/xxx/contratos/yyy/v1/arquivo.pdf)
 * 3. Caminhos corrompidos (remove UUIDs no início se não corresponder ao padrão esperado)
 */
function normalizePdfReference(value: string | null): string | null {
  if (!value) return null;

  const value_trimmed = value.trim();

  // Se for URL completa (começa com http), tentar extrair o caminho
  if (value_trimmed.startsWith("http")) {
    try {
      const parsed = new URL(value_trimmed);
      const pathSegments = parsed.pathname.split("/");

      // Procura por /sign/ que indica URL assinada Supabase
      const signIndex = pathSegments.findIndex((segment) => segment === "sign");
      if (signIndex >= 0 && pathSegments.length > signIndex + 2) {
        // Remove "storage/v1/sign/contratos/" e extrai o caminho do arquivo
        const objectPath = pathSegments.slice(signIndex + 2).join("/");
        return decodeURIComponent(objectPath);
      }

      // Se não tiver /sign/, tenta extrair de forma genérica
      // Procura por onde começa "contratos/"
      const contratoIndex = pathSegments.findIndex((p) => p === "contratos");
      if (contratoIndex > 0) {
        return pathSegments.slice(contratoIndex).join("/");
      }

      return value_trimmed;
    } catch (e) {
      console.error("[normalizePdfReference] Erro ao parsear URL:", {
        value: value_trimmed,
        error: e instanceof Error ? e.message : String(e),
      });
      return value_trimmed;
    }
  }

  // Se for caminho relativo e começar com UUID corrompido, tentar recuperar
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  if (uuidPattern.test(value_trimmed)) {
    console.warn("[normalizePdfReference] Caminho com UUID detectado:", {
      original: value_trimmed,
      msg: "Caminho pode estar corrompido. Esperado: clientes/{id}/contratos/...",
    });

    const parts = value_trimmed.split("/");
    const contratoIndex = parts.findIndex((p) => p === "contratos");
    if (contratoIndex > 0) {
      const recovered = [
        "clientes",
        parts[0],
        ...parts.slice(contratoIndex),
      ].join("/");
      console.warn("[normalizePdfReference] Caminho recuperado:", {
        recovered,
      });
      return recovered;
    }
  }

  // Se for caminho relativo normal, apenas retorna
  // Formato esperado: clientes/{cliente_id}/contratos/{contrato_id}/v{versao}/arquivo.pdf
  if (value_trimmed.includes("contratos/")) {
    return value_trimmed;
  }

  return value_trimmed;
}

function buildExpectedPdfPath(contrato: {
  cliente_id: string;
  id: string;
  versao: number;
}): string {
  return `clientes/${contrato.cliente_id}/contratos/${contrato.id}/v${contrato.versao}/contrato-gerado.pdf`;
}

function buildContractPrefix(contrato: {
  cliente_id: string;
  id: string;
}): string {
  return `clientes/${contrato.cliente_id}/contratos/${contrato.id}`;
}

async function findGeneratedPdfInContractVersions(
  supabase: any,
  bucket: string,
  contractPrefix: string,
) {
  try {
    const { data: entries, error: listError } = await supabase.storage
      .from(bucket)
      .list(contractPrefix, { limit: 100 });

    if (listError || !entries) {
      return { candidatePath: null as string | null, error: listError ?? null };
    }

    for (const entry of entries) {
      if (!entry.name.startsWith("v")) {
        continue;
      }

      const candidatePath = `${contractPrefix}/${entry.name}/contrato-gerado.pdf`;
      const { data: metadata, error: metadataError } = await supabase.storage
        .from(bucket)
        .getMetadata(candidatePath);

      if (!metadataError && metadata?.metadata?.size != null) {
        return { candidatePath, error: null as null };
      }
    }
  } catch (err) {
    return { candidatePath: null as string | null, error: err as Error };
  }

  return { candidatePath: null as string | null, error: null };
}

async function createSignedUrlWithFallback(
  supabase: any,
  pdfPath: string,
  expectedPath: string | null,
  contractPrefix: string | null,
) {
  const firstAttempt = await supabase.storage
    .from("contratos")
    .createSignedUrl(pdfPath, 3600);

  if (!firstAttempt.error) {
    return { path: pdfPath, data: firstAttempt.data, error: null as null };
  }

  if (
    expectedPath &&
    expectedPath !== pdfPath &&
    (firstAttempt.error.status === 404 ||
      firstAttempt.error.message?.toLowerCase().includes("not found"))
  ) {
    console.warn("[PDF-URL] Fallback para caminho esperado:", {
      originalPath: pdfPath,
      expectedPath,
    });
    const fallbackAttempt = await supabase.storage
      .from("contratos")
      .createSignedUrl(expectedPath, 3600);

    if (!fallbackAttempt.error) {
      return {
        path: expectedPath,
        data: fallbackAttempt.data,
        error: null as null,
        fallback: true,
      };
    }

    if (contractPrefix) {
      console.warn("[PDF-URL] Tentando buscar PDF em versões existentes:", {
        contractPrefix,
      });
      const { candidatePath, error: searchError } =
        await findGeneratedPdfInContractVersions(
          supabase,
          "contratos",
          contractPrefix,
        );

      if (candidatePath) {
        const candidateAttempt = await supabase.storage
          .from("contratos")
          .createSignedUrl(candidatePath, 3600);

        return {
          path: candidatePath,
          data: candidateAttempt.data,
          error: candidateAttempt.error,
          fallback: true,
          candidatePath,
          searchError: searchError?.message ?? null,
        };
      }

      return {
        path: expectedPath,
        data: null,
        error: fallbackAttempt.error,
        fallback: true,
        searchError: searchError?.message ?? null,
      };
    }

    return {
      path: expectedPath,
      data: null,
      error: fallbackAttempt.error,
      fallback: true,
    };
  }

  return { path: pdfPath, data: null, error: firstAttempt.error };
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
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Buscar contrato com todos os campos relevantes
    const { data: contrato, error } = await supabase
      .from("contratos")
      .select(
        "id, cliente_id, versao, numero_contrato, pdf_url, pdf_assinado_url, status",
      )
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
    const expectedPdfPath = contrato.cliente_id
      ? buildExpectedPdfPath(contrato)
      : null;
    const contractPrefix = contrato.cliente_id
      ? buildContractPrefix(contrato)
      : null;

    console.log("[PDF-URL] Debug info:", {
      contratoId,
      numero_contrato: contrato.numero_contrato,
      status: contrato.status,
      has_pdf_assinado: !!contrato.pdf_assinado_url,
      has_pdf_url: !!contrato.pdf_url,
      rawPdfPath: rawPdfPath?.substring(0, 80),
      normalizedPath: pdfPath?.substring(0, 80),
      expectedPdfPath: expectedPdfPath?.substring(0, 80),
      contractPrefix,
      will_process: pdfPath ? "✓" : "✗",
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
      console.log("[PDF-URL] Gerando signed URL para:", {
        pdfPath: pdfPath.substring(0, 80),
        expectedPdfPath: expectedPdfPath?.substring(0, 80),
        bucketName: "contratos",
      });

      const signedUrlResult = await createSignedUrlWithFallback(
        supabase,
        pdfPath,
        expectedPdfPath,
        contractPrefix,
      );

      const {
        data,
        error: urlError,
        path: finalPath,
        fallback,
        candidatePath,
        searchError,
      } = signedUrlResult;

      if (urlError) {
        console.error("[PDF-URL] createSignedUrl error:", {
          pdfPath: pdfPath.substring(0, 80),
          finalPath: finalPath.substring(0, 80),
          fallback,
          errorMessage: urlError.message,
          errorStatus: urlError.status,
        });

        if (
          urlError.status === 404 ||
          urlError.message?.includes("not found")
        ) {
          return NextResponse.json(
            {
              error: "Arquivo PDF não encontrado no armazenamento",
              debug: {
                pdfPath,
                finalPath,
                expectedPdfPath,
                candidatePath,
                searchError,
                msg: "O arquivo foi deletado ou o caminho está inválido",
              },
            },
            { status: 404 },
          );
        }

        return NextResponse.json(
          {
            error: "Erro ao gerar URL assinada do PDF",
            debug: {
              pdfPath,
              finalPath,
              expectedPdfPath,
              storageError: urlError.message,
            },
          },
          { status: 500 },
        );
      }

      if (!data?.signedUrl) {
        console.error("[PDF-URL] signedUrl vazia:", {
          pdfPath,
          finalPath,
          data,
        });
        return NextResponse.json(
          {
            error: "URL assinada não foi gerada corretamente",
            debug: { pdfPath, finalPath, expectedPdfPath },
          },
          { status: 500 },
        );
      }

      console.log("[PDF-URL] ✓ Success:", {
        contratoId,
        numero_contrato: contrato.numero_contrato,
        pdfPath: finalPath.substring(0, 50) + "...",
        signedUrlLength: data.signedUrl.length,
        fallback,
      });

      return NextResponse.json({
        url: data.signedUrl,
      });
    } catch (storageErr) {
      console.error("[PDF-URL] Storage exception:", {
        error:
          storageErr instanceof Error ? storageErr.message : String(storageErr),
        pdfPath,
        stack: storageErr instanceof Error ? storageErr.stack : undefined,
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
