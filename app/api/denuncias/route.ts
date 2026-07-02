import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

function normalizeRpcResult(u: unknown): string | null {
  if (u == null) return null;
  if (typeof u === "string") return u;
  if (typeof u === "number") return String(u);
  if (Array.isArray(u) && u.length > 0) {
    const first = u[0];
    return (
      (typeof first === "string" && first) ||
      first?.usuario_id ||
      first?.current_usuario_id ||
      null
    );
  }
  if (typeof u === "object") {
    const record = u as Record<string, unknown>;
    return (
      (typeof record.usuario_id === "string" && record.usuario_id) ||
      (typeof record.current_usuario_id === "string" &&
        record.current_usuario_id) ||
      null
    );
  }
  return null;
}

export const runtime = "nodejs";

type Role = "admin" | "cliente" | "gestor" | "usuario" | null;

// ─── GET /api/denuncias ───────────────────────────────────────────────────────
export async function GET() {
  try {
    const supabase = await createServerSupabase();

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    const claims = parseJwtClaims(session.access_token);

    if (claims.ativo === false) {
      return NextResponse.json({ error: "user_inactive" }, { status: 403 });
    }

    if (claims.role !== "admin" && claims.role !== "cliente") {
      return NextResponse.json({ error: "access_denied" }, { status: 403 });
    }

    // Resolve clienteId: JWT claim ou fallback via DB
    let effectiveClienteId = claims.clienteId;

    if (!effectiveClienteId && claims.role !== "admin") {
      const { data: rpcData } = await supabase.rpc("current_usuario_id");
      const usuarioId = normalizeRpcResult(rpcData);
      if (usuarioId) {
        const { data: usr } = await supabase
          .from("usuarios")
          .select("cliente_id")
          .eq("id", usuarioId)
          .maybeSingle();
        effectiveClienteId = (usr?.cliente_id as string | null) ?? null;
      }
    }

    if (!effectiveClienteId && claims.role !== "admin") {
      return NextResponse.json(
        { error: "tenant_not_resolved" },
        { status: 403 },
      );
    }

    const adminDb = getSupabaseAdmin();

    let denunciasQuery = adminDb
      .from("denuncias")
      .select("*")
      .order("created_at", { ascending: false });

    if (claims.role !== "admin") {
      denunciasQuery = denunciasQuery.eq("cliente_id", effectiveClienteId!);
    }

    const [
      { data: denuncias, error: denunciasError },
      { data: arquivos, error: arquivosError },
    ] = await Promise.all([
      denunciasQuery,
      adminDb
        .from("denuncias_arquivos")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    if (denunciasError) {
      console.error("[api/denuncias GET] denuncias:", denunciasError);
      return NextResponse.json(
        { error: denunciasError.message },
        { status: 500 },
      );
    }

    // Filtrar arquivos pelo conjunto de denúncias retornadas
    const denunciaIds = new Set(
      (denuncias ?? []).map((d: { id: string }) => d.id),
    );
    const arquivosFiltrados = (arquivos ?? []).filter(
      (a: { denuncia_id: string }) => denunciaIds.has(a.denuncia_id),
    );

    return NextResponse.json({
      ok: true,
      denuncias: denuncias ?? [],
      arquivos: arquivosFiltrados,
    });
  } catch (error) {
    console.error("[api/denuncias GET] unexpected:", error);
    return NextResponse.json({ error: "unexpected_failure" }, { status: 500 });
  }
}
type Plano = "express" | "premium" | null;

const MAX_FILES = 5;
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
];

function parseBoolean(value: FormDataEntryValue | null) {
  return String(value) === "true";
}

function parseString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function parseJwtClaims(accessToken: string | null | undefined): {
  role: Role;
  plano: Plano;
  clienteId: string | null;
  ativo: boolean | null;
} {
  if (!accessToken) {
    return { role: null, plano: null, clienteId: null, ativo: null };
  }

  try {
    const parts = accessToken.split(".");
    if (parts.length !== 3) {
      return { role: null, plano: null, clienteId: null, ativo: null };
    }

    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8"),
    ) as Record<string, unknown>;

    const appMetadata = (payload.app_metadata ?? payload) as Record<
      string,
      unknown
    >;

    const role =
      appMetadata.user_role === "admin" ||
      appMetadata.user_role === "cliente" ||
      appMetadata.user_role === "gestor" ||
      appMetadata.user_role === "usuario"
        ? (appMetadata.user_role as Role)
        : null;

    const plano =
      appMetadata.user_plano === "express" ||
      appMetadata.user_plano === "premium"
        ? (appMetadata.user_plano as Plano)
        : null;

    const clienteId =
      typeof appMetadata.user_cliente_id === "string"
        ? appMetadata.user_cliente_id
        : null;

    const ativo =
      typeof appMetadata.user_ativo === "boolean"
        ? appMetadata.user_ativo
        : null;

    return { role, plano, clienteId, ativo };
  } catch {
    return { role: null, plano: null, clienteId: null, ativo: null };
  }
}

function extensionFromFilename(name: string) {
  const parts = name.split(".");
  if (parts.length < 2) return "";
  return parts.pop()?.toLowerCase() ?? "";
}

function isFutureDate(dateString: string | null) {
  if (!dateString) return false;

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayISO = `${yyyy}-${mm}-${dd}`;

  return dateString > todayISO;
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabase();

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    const claims = parseJwtClaims(session.access_token);

    if (claims.ativo === false) {
      return NextResponse.json({ error: "user_inactive" }, { status: 403 });
    }

    if (!claims.clienteId) {
      return NextResponse.json(
        { error: "tenant_not_resolved" },
        { status: 403 },
      );
    }

    if (!claims.role || !claims.plano) {
      return NextResponse.json(
        { error: "invalid_token_claims" },
        { status: 403 },
      );
    }

    const form = await req.formData();

    const anonimizada = parseBoolean(form.get("anonimizada"));
    const categoria = parseString(form.get("categoria")) || "nao_conformidade";
    const titulo = parseString(form.get("titulo"));
    const descricao = parseString(form.get("descricao"));
    const localOcorrencia = parseString(form.get("localOcorrencia")) || null;
    const dataOcorrencia = parseString(form.get("dataOcorrencia")) || null;
    const riscoIminente = parseBoolean(form.get("riscoIminente"));
    const contatoRetorno = parseString(form.get("contatoRetorno")) || null;
    const consentimentoTratamento = parseBoolean(
      form.get("consentimentoTratamento"),
    );
    const origem = parseString(form.get("origem")) || "acesso_basico_express";

    const files = form
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File);

    if (!titulo) {
      return NextResponse.json(
        { error: "titulo_obrigatorio" },
        { status: 400 },
      );
    }

    if (!descricao || descricao.length < 20) {
      return NextResponse.json(
        { error: "descricao_insuficiente" },
        { status: 400 },
      );
    }

    if (!consentimentoTratamento) {
      return NextResponse.json(
        { error: "consentimento_obrigatorio" },
        { status: 400 },
      );
    }

    if (dataOcorrencia && isFutureDate(dataOcorrencia)) {
      return NextResponse.json(
        { error: "data_ocorrencia_futura" },
        { status: 400 },
      );
    }

    if (anonimizada && files.length > 0) {
      return NextResponse.json(
        { error: "anonymous_upload_not_allowed" },
        { status: 400 },
      );
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: "too_many_files" }, { status: 400 });
    }

    for (const file of files) {
      const ext = extensionFromFilename(file.name);
      const allowedExtensions = ["pdf", "png", "jpg", "jpeg", "webp"];
      const mimeValido = ALLOWED_MIME_TYPES.includes(file.type);
      const extValida = allowedExtensions.includes(ext);

      if (!mimeValido && !extValida) {
        return NextResponse.json(
          {
            error: `invalid_file_type:${file.name}`,
            detail: {
              mime: file.type,
              extension: ext,
            },
          },
          { status: 400 },
        );
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: `file_too_large:${file.name}` },
          { status: 400 },
        );
      }
    }

    const adminDb = getSupabaseAdmin();
    const protocolo = `ALM-${Date.now().toString().slice(-8)}`;

    // Resolver usuario_id canônico via RPC (usa o client com cookies)
    const { data: usuarioRpcData, error: usuarioRpcErr } =
      await supabase.rpc("current_usuario_id");

    const usuarioId = usuarioRpcErr ? null : normalizeRpcResult(usuarioRpcData);

    const { data: denuncia, error: insertError } = await adminDb
      .from("denuncias")
      .insert({
        protocolo,
        cliente_id: claims.clienteId,
        canal: "app_express",
        origem,
        anonimizada,
        categoria,
        titulo,
        descricao,
        local_ocorrencia: localOcorrencia,
        data_ocorrencia: dataOcorrencia,
        risco_iminente: riscoIminente,
        contato_retorno: anonimizada ? null : contatoRetorno,
        consentimento_tratamento: consentimentoTratamento,
        status: "recebida",
        created_by_user_id: anonimizada ? null : usuarioId,
        created_by_role: anonimizada ? null : claims.role,
      })
      .select("id")
      .single();

    if (insertError || !denuncia?.id) {
      console.error("Erro ao inserir denúncia:", insertError);
      return NextResponse.json({ error: "insert_failed" }, { status: 500 });
    }

    if (files.length > 0) {
      const uploadedPaths: string[] = [];
      const evidenciasRows: Array<{
        denuncia_id: string;
        bucket: string;
        storage_path: string;
        mime_type: string;
        tamanho_bytes: number;
        nome_original: string | null;
      }> = [];

      for (const file of files) {
        const ext = extensionFromFilename(file.name);
        const internalName = `${randomUUID()}${ext ? `.${ext}` : ""}`;
        const storagePath = `${claims.clienteId}/${denuncia.id}/${internalName}`;

        const arrayBuffer = await file.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);

        const { error: uploadError } = await adminDb.storage
          .from("denuncias")
          .upload(storagePath, fileBuffer, {
            contentType: file.type || "application/octet-stream",
            upsert: false,
          });

        if (uploadError) {
          console.error("Erro ao enviar arquivo:", uploadError);

          if (uploadedPaths.length > 0) {
            await adminDb.storage.from("denuncias").remove(uploadedPaths);
          }

          return NextResponse.json(
            {
              error: `upload_failed:${file.name}`,
              detail: uploadError.message ?? String(uploadError),
            },
            { status: 500 },
          );
        }

        uploadedPaths.push(storagePath);

        evidenciasRows.push({
          denuncia_id: denuncia.id,
          bucket: "denuncias-evidencias",
          storage_path: storagePath,
          mime_type: file.type || "application/octet-stream",
          tamanho_bytes: file.size,
          nome_original: anonimizada ? null : file.name,
        });
      }

      const { error: evidenceError } = await adminDb
        .from("denuncias_arquivos")
        .insert(evidenciasRows);

      if (evidenceError) {
        console.error("Erro ao inserir metadados dos arquivos:", evidenceError);

        if (uploadedPaths.length > 0) {
          await adminDb.storage.from("denuncias").remove(uploadedPaths);
        }

        return NextResponse.json(
          {
            error: "evidence_metadata_insert_failed",
            detail: evidenceError.message ?? String(evidenceError),
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      ok: true,
      protocol: protocolo,
    });
  } catch (error) {
    console.error("Erro inesperado em /api/denuncias:", error);

    return NextResponse.json(
      {
        error: "unexpected_failure",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
