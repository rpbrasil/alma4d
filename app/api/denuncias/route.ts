import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

type Role = "admin" | "cliente" | "gestor" | "usuario" | null;
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

    const role =
      payload.user_role === "admin" ||
      payload.user_role === "cliente" ||
      payload.user_role === "gestor" ||
      payload.user_role === "usuario"
        ? (payload.user_role as Role)
        : null;

    const plano =
      payload.user_plano === "express" || payload.user_plano === "premium"
        ? (payload.user_plano as Plano)
        : null;

    const clienteId =
      typeof payload.user_cliente_id === "string"
        ? payload.user_cliente_id
        : null;

    const ativo =
      typeof payload.user_ativo === "boolean" ? payload.user_ativo : null;

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
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {
            // sem necessidade aqui
          },
        },
      },
    );

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

    // Opcionalmente você pode endurecer a validação:
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
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `invalid_file_type:${file.name}` },
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
        created_by_user_id: anonimizada ? null : session.user.id,
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
          .from("denuncias-evidencias")
          .upload(storagePath, fileBuffer, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          console.error("Erro ao enviar arquivo:", uploadError);

          // cleanup dos uploads anteriores
          if (uploadedPaths.length > 0) {
            await adminDb.storage
              .from("denuncias-evidencias")
              .remove(uploadedPaths);
          }

          return NextResponse.json(
            { error: `upload_failed:${file.name}` },
            { status: 500 },
          );
        }

        uploadedPaths.push(storagePath);

        evidenciasRows.push({
          denuncia_id: denuncia.id,
          bucket: "denuncias-evidencias",
          storage_path: storagePath,
          mime_type: file.type,
          tamanho_bytes: file.size,
          nome_original: anonimizada ? null : file.name,
        });
      }

      const { error: evidenceError } = await adminDb
        .from("denuncias_arquivos")
        .insert(evidenciasRows);

      if (evidenceError) {
        console.error("Erro ao inserir metadados dos arquivos:", evidenceError);

        // cleanup arquivos já enviados para evitar órfãos
        if (uploadedPaths.length > 0) {
          await adminDb.storage
            .from("denuncias-evidencias")
            .remove(uploadedPaths);
        }

        return NextResponse.json(
          { error: "evidence_metadata_insert_failed" },
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
    return NextResponse.json({ error: "unexpected_failure" }, { status: 500 });
  }
}