import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

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

type AppMetadata = {
  user_role?: string;
  user_cliente_id?: string;
  user_ativo?: boolean;
};

function parseJwt(token: string | undefined | null) {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8"),
    ) as Record<string, unknown>;
    const meta = payload.app_metadata as AppMetadata | undefined;
    return {
      role: meta?.user_role ?? null,
      clienteId:
        typeof meta?.user_cliente_id === "string" ? meta.user_cliente_id : null,
      ativo: typeof meta?.user_ativo === "boolean" ? meta.user_ativo : null,
    };
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const contratoId = searchParams.get("contrato_id");

  if (!contratoId) {
    return NextResponse.json(
      { error: "contrato_id obrigatório" },
      { status: 400 },
    );
  }

  // ✅ SSR cookie auth — mesma sessão do browser
  const supabase = await createServerSupabase();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const claims = parseJwt(session?.access_token);

  if (!claims || claims.ativo !== true) {
    return NextResponse.json({ error: "user_inactive" }, { status: 403 });
  }

  const adminDb = getSupabaseAdmin();

  // Resolve clienteId: prioriza JWT claim, cai no DB como fallback
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

  // ✅ busca contrato e valida tenant
  const { data: contrato, error: contratoError } = await adminDb
    .from("contratos")
    .select("id, cliente_id, limite_usuarios")
    .eq("id", contratoId)
    .maybeSingle();

  if (contratoError || !contrato) {
    return NextResponse.json(
      { error: "Contrato não encontrado" },
      { status: 404 },
    );
  }

  // ✅ multi-tenant: admin passa livre; outros só veem seu próprio cliente
  if (
    claims.role !== "admin" &&
    String(contrato.cliente_id) !== String(effectiveClienteId)
  ) {
    return NextResponse.json(
      { error: "Acesso a contrato de outro tenant" },
      { status: 403 },
    );
  }

  const limite = Number(contrato.limite_usuarios ?? 0);

  // ✅ contagens por status
  const [{ count: elegiveis }, { count: respondidos }, { count: removidos }] =
    await Promise.all([
      adminDb
        .from("questionario_vagas")
        .select("id", { count: "exact", head: true })
        .eq("contrato_id", contratoId)
        .eq("status", "elegivel"),

      adminDb
        .from("questionario_vagas")
        .select("id", { count: "exact", head: true })
        .eq("contrato_id", contratoId)
        .eq("status", "respondido"),

      adminDb
        .from("questionario_vagas")
        .select("id", { count: "exact", head: true })
        .eq("contrato_id", contratoId)
        .eq("status", "removido"),
    ]);

  const eleg = elegiveis ?? 0;
  const resp = respondidos ?? 0;
  const rem = removidos ?? 0;

  const restantes = Math.max(0, limite - eleg - resp);

  return NextResponse.json({
    contrato_id: contratoId,
    limite,
    elegiveis: eleg,
    respondidos: resp,
    removidos: rem,
    restantes,
  });
}
