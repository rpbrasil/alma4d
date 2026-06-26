import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { normalizePdfReference } from "@/api/contrato/_shared/normalizePdfReference";

/**
 * =========================
 * TYPES
 * =========================
 */

type ContratoPdfRow = {
  id: string;
  cliente_id: string;
  versao: number;
  numero_contrato: string | null;
  pdf_url: string | null;
  pdf_assinado_url: string | null;
  status: string | null;
};

type StorageErrorLike = {
  message: string;
  status?: number;
};

type StorageListEntry = {
  name: string;
};

type StorageMetadata = {
  metadata?: {
    size?: number | null;
  } | null;
};

type SignedUrlData = {
  signedUrl: string;
};

type StorageBucketLike = {
  list: (
    path: string,
    options?: { limit?: number },
  ) => Promise<{
    data: StorageListEntry[] | null;
    error: StorageErrorLike | null;
  }>;
  getMetadata: (path: string) => Promise<{
    data: StorageMetadata | null;
    error: StorageErrorLike | null;
  }>;
  createSignedUrl: (
    path: string,
    expiresIn: number,
  ) => Promise<{
    data: SignedUrlData | null;
    error: StorageErrorLike | null;
  }>;
};

type SupabaseStorageLike = {
  storage: {
    from: (bucket: string) => StorageBucketLike;
  };
};

type FindGeneratedPdfResult = {
  candidatePath: string | null;
  error: StorageErrorLike | null;
};

type CreateSignedUrlWithFallbackResult = {
  path: string;
  data: SignedUrlData | null;
  error: StorageErrorLike | null;
  fallback?: boolean;
  candidatePath?: string;
  searchError?: string | null;
};

function toStorageErrorLike(error: unknown): StorageErrorLike {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    const maybeStatus =
      "status" in error &&
      typeof (error as { status?: unknown }).status === "number"
        ? (error as { status?: number }).status
        : undefined;

    return {
      message: (error as { message: string }).message,
      status: maybeStatus,
    };
  }

  return {
    message: error instanceof Error ? error.message : String(error),
  };
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

/**
 * =========================
 * STORAGE HELPERS
 * =========================
 */

async function findGeneratedPdfInContractVersions(
  supabase: SupabaseStorageLike,
  bucket: string,
  contractPrefix: string,
): Promise<FindGeneratedPdfResult> {
  try {
    const { data: entries, error: listError } = await supabase.storage
      .from(bucket)
      .list(contractPrefix, { limit: 100 });

    if (listError || !entries) {
      return {
        candidatePath: null,
        error: listError ?? null,
      };
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
        return { candidatePath, error: null };
      }
    }
  } catch (err) {
    return {
      candidatePath: null,
      error: toStorageErrorLike(err),
    };
  }

  return { candidatePath: null, error: null };
}

async function createSignedUrlWithFallback(
  supabase: SupabaseStorageLike,
  pdfPath: string,
  expectedPath: string | null,
  contractPrefix: string | null,
): Promise<CreateSignedUrlWithFallbackResult> {
  const firstAttempt = await supabase.storage
    .from("contratos")
    .createSignedUrl(pdfPath, 3600);

  if (!firstAttempt.error) {
    return {
      path: pdfPath,
      data: firstAttempt.data,
      error: null,
    };
  }

  if (
    expectedPath &&
    expectedPath !== pdfPath &&
    (firstAttempt.error.status === 404 ||
      firstAttempt.error.message.toLowerCase().includes("not found"))
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
        error: null,
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

  return {
    path: pdfPath,
    data: null,
    error: firstAttempt.error,
  };
}

/**
 * =========================
 * ROUTE
 * =========================
 */

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

    const supabase = getSupabaseAdmin();

    // Buscar contrato com todos os campos relevantes
    const { data: contratoRaw, error } = await supabase
      .from("contratos")
      .select(
        "id, cliente_id, versao, numero_contrato, pdf_url, pdf_assinado_url, status",
      )
      .eq("id", contratoId)
      .single();

    const contrato = (contratoRaw ?? null) as ContratoPdfRow | null;

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

    try {
      console.log("[PDF-URL] Gerando signed URL para:", {
        pdfPath: pdfPath.substring(0, 80),
        expectedPdfPath: expectedPdfPath?.substring(0, 80),
        bucketName: "contratos",
      });

      const signedUrlResult = await createSignedUrlWithFallback(
        supabase as unknown as SupabaseStorageLike,
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

        if (urlError.status === 404 || urlError.message.includes("not found")) {
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
        pdfPath: `${finalPath.substring(0, 50)}...`,
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
