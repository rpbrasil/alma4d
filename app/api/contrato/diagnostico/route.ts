import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type DiagnosticoCheck = Record<string, unknown>;

interface DiagnosticoResponse {
  status: "sucesso" | "erro";
  contrato_id: string;
  numero_contrato: string;
  cliente_id: string | null;
  status_contrato: string;
  checks: DiagnosticoCheck[];
}

// Tipo mínimo só para você conseguir ler size sem brigar com TS
type StorageInfoLike = {
  metadata?: {
    size?: number;
    mimetype?: string;
    [k: string]: unknown;
  };
  // algumas versões expõem size em outro nível; deixamos flexível:
  size?: number;
  [k: string]: unknown;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const contratoId = searchParams.get("contratoId");

  if (!contratoId) {
    return NextResponse.json(
      { error: "contratoId obrigatório" },
      { status: 400 },
    );
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: contrato, error: contratoError } = await supabase
      .from("contratos")
      .select(
        "id, cliente_id, numero_contrato, status, pdf_url, pdf_assinado_url",
      )
      .eq("id", contratoId)
      .single();

    if (contratoError || !contrato) {
      return NextResponse.json({
        status: "erro",
        step: "banco_dados",
        msg: "Contrato não encontrado no banco de dados",
        debug: { contratoId, error: contratoError?.message },
      });
    }

    const diagnostico: DiagnosticoResponse = {
      status: "sucesso",
      contrato_id: contrato.id,
      numero_contrato: contrato.numero_contrato,
      cliente_id: contrato.cliente_id,
      status_contrato: contrato.status,
      checks: [],
    };

    const pdfUrlRaw = contrato.pdf_url;
    const pdfAssinadoRaw = contrato.pdf_assinado_url;

    diagnostico.checks.push({
      check: "Campos PDF no banco",
      pdf_url: pdfUrlRaw ? `${pdfUrlRaw.substring(0, 60)}...` : null,
      pdf_assinado_url: pdfAssinadoRaw
        ? `${pdfAssinadoRaw.substring(0, 60)}...`
        : null,
      resultado:
        pdfUrlRaw || pdfAssinadoRaw ? "✓ Encontrado" : "✗ Não encontrado",
    });

    const pdfPath = pdfAssinadoRaw || pdfUrlRaw;

    if (!pdfPath) {
      diagnostico.checks.push({
        check: "Verificação Supabase Storage",
        resultado: "⚠ Pulado (nenhum PDF no banco)",
      });
      return NextResponse.json(diagnostico);
    }

    try {
      const normalizedPath =
        pdfPath.startsWith("http") ||
        pdfPath.startsWith("clientes") ||
        /^[0-9a-f]{8}-/.test(pdfPath)
          ? extractPathFromPdfRef(pdfPath)
          : pdfPath;

      // ✅ getMetadata -> info (metadados do arquivo) [1](https://supabase.com/docs/reference/javascript/storage-from-info)[2](https://deepwiki.com/supabase/storage-js/2-core-api-reference)
      const { data: fileInfoRaw, error: fileError } = await supabase.storage
        .from("contratos")
        .info(normalizedPath);

      const fileInfo = fileInfoRaw as unknown as StorageInfoLike | null;

      const size = fileInfo?.metadata?.size ?? fileInfo?.size ?? null;

      const fileExists = !fileError && size != null;

      diagnostico.checks.push({
        check: "Arquivo no Supabase Storage",
        caminho_tentado: normalizedPath.substring(0, 80),
        arquivo_existe: fileExists,
        arquivo_tamanho: size,
        erro: fileError?.message || null,
        resultado: fileExists
          ? `✓ Encontrado (${size} bytes)`
          : "✗ Não encontrado ou inacessível",
      });

      const contractPrefix = contrato.cliente_id
        ? `clientes/${contrato.cliente_id}/contratos/${contrato.id}`
        : null;

      if (!fileExists && contractPrefix) {
        const versionCandidates: string[] = [];

        const { data: versionEntries } = await supabase.storage
          .from("contratos")
          .list(contractPrefix, { limit: 100 });

        if (versionEntries) {
          for (const entry of versionEntries) {
            if (!entry.name.startsWith("v")) continue;
            versionCandidates.push(
              `${contractPrefix}/${entry.name}/contrato-gerado.pdf`,
            );
          }
        }

        const foundCandidates: string[] = [];
        for (const candidatePath of versionCandidates) {
          // ✅ getMetadata -> info também aqui [1](https://supabase.com/docs/reference/javascript/storage-from-info)[2](https://deepwiki.com/supabase/storage-js/2-core-api-reference)
          const { data: candInfoRaw, error: candError } = await supabase.storage
            .from("contratos")
            .info(candidatePath);

          const candInfo = candInfoRaw as unknown as StorageInfoLike | null;
          const candSize = candInfo?.metadata?.size ?? candInfo?.size ?? null;

          if (!candError && candSize != null) {
            foundCandidates.push(candidatePath);
          }
        }

        diagnostico.checks.push({
          check: "Tentativa de localizar PDF por versão",
          contractPrefix,
          versionCandidates,
          foundCandidates,
          resultado: foundCandidates.length
            ? `✓ Encontrado em ${foundCandidates.length} versão(ões)`
            : "✗ Não encontrado em versões conhecidas",
        });
      }

      if (fileExists) {
        const { data: signedUrl, error: signError } = await supabase.storage
          .from("contratos")
          .createSignedUrl(normalizedPath, 3600);

        diagnostico.checks.push({
          check: "Geração de URL assinada",
          url_gerada: !!signedUrl?.signedUrl,
          url_tamanho: signedUrl?.signedUrl?.length || 0,
          resultado: signedUrl?.signedUrl ? "✓ OK" : `✗ ${signError?.message}`,
        });
      }
    } catch (e) {
      diagnostico.checks.push({
        check: "Verificação Supabase Storage",
        erro: e instanceof Error ? e.message : String(e),
        resultado: "✗ Erro ao verificar",
      });
    }

    const { data: eventos } = await supabase
      .from("contrato_eventos")
      .select("tipo, created_at")
      .eq("contrato_id", contratoId)
      .order("created_at", { ascending: false });

    diagnostico.checks.push({
      check: "Eventos de contrato",
      total: eventos?.length || 0,
      tipos: eventos?.map((e) => e.tipo) || [],
      resultado: eventos && eventos.length > 0 ? "✓ OK" : "⚠ Nenhum evento",
    });

    return NextResponse.json(diagnostico);
  } catch (err) {
    return NextResponse.json(
      {
        status: "erro",
        step: "geral",
        msg: err instanceof Error ? err.message : "Erro desconhecido",
      },
      { status: 500 },
    );
  }
}

function extractPathFromPdfRef(value: string): string {
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

  if (uuidPattern.test(value)) {
    const parts = value.split("/");
    const contratoIndex = parts.findIndex((p) => p === "contratos");
    if (contratoIndex > 0) {
      return ["clientes", parts[0], ...parts.slice(contratoIndex)].join("/");
    }
  }

  if (value.startsWith("http")) {
    try {
      const parsed = new URL(value);
      const pathSegments = parsed.pathname.split("/");
      const signIndex = pathSegments.findIndex((segment) => segment === "sign");
      if (signIndex >= 0) return pathSegments.slice(signIndex + 2).join("/");
    } catch {
      // ignore
    }
  }

  return value;
}
