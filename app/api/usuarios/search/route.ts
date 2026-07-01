import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

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
  const nome = (searchParams.get("nome") ?? "").trim();
  const documento = (searchParams.get("documento") ?? "").replace(/\D/g, "");

  if (!nome && !documento) {
    return NextResponse.json(
      { error: "Informe nome ou documento" },
      { status: 400 },
    );
  }

  // ✅ SSR cookie auth
  const supabaseSsr = await createServerSupabase();

  const {
    data: { user },
    error: userError,
  } = await supabaseSsr.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const {
    data: { session },
  } = await supabaseSsr.auth.getSession();

  const claims = parseJwt(session?.access_token);

  // Resolve tenantId e valida papel — aceita admin, cliente e gestor
  let tenantId: string | null = null;
  const allowedRoles = ["admin", "cliente", "gestor"];

  if (claims && allowedRoles.includes(claims.role ?? "")) {
    // Caminho normal: claims do JWT têm o papel
    if (claims.ativo !== true) {
      return NextResponse.json({ error: "user_inactive" }, { status: 403 });
    }
    if (claims.role === "admin") {
      tenantId = searchParams.get("cliente_id") ?? null;
    } else {
      tenantId = claims.clienteId ?? null;
    }
  }

  // Fallback: resolve via RPC quando JWT não tem claims completas
  if (!tenantId) {
    const { data: rpcResult } = await supabaseSsr.rpc("current_usuario_id");
    const rpcId = rpcResult
      ? typeof rpcResult === "string"
        ? rpcResult
        : (rpcResult as { usuario_id?: string })?.usuario_id ?? null
      : null;
    if (rpcId) {
      const { data: usuarioDb } = await getSupabaseAdmin()
        .from("usuarios")
        .select("cliente_id, role")
        .eq("id", rpcId)
        .maybeSingle();
      if (usuarioDb && allowedRoles.includes(usuarioDb.role ?? "")) {
        tenantId =
          usuarioDb.role === "admin"
            ? (searchParams.get("cliente_id") ?? null)
            : (usuarioDb.cliente_id ?? null);
      }
    }
  }

  if (!tenantId) {
    return NextResponse.json({ error: "tenant_not_resolved" }, { status: 403 });
  }

  const adminDb = getSupabaseAdmin();

  const baseQuery = () =>
    adminDb
      .from("usuarios")
      .select(
        "id, nome_completo, email, telefone, documento, ativo, cliente_id",
      )
      .eq("role", "usuario")
      .eq("cliente_id", tenantId)
      .limit(50);

  if (documento) {
    // ilike cobre buscas parciais (ex: "231") e também CPFs formatados
    // armazenados como "123.456.789-00" pois os dígitos estão presentes na string
    const { data, error } = await baseQuery().ilike(
      "documento",
      `%${documento}%`,
    );

    if (error) {
      console.error("[api/usuarios/search] documento:", error);
      return NextResponse.json(
        { error: "Erro ao consultar usuários" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, usuarios: data ?? [] });
  }

  const { data, error } = await baseQuery()
    .ilike("nome_completo", `%${nome}%`)
    .order("nome_completo", { ascending: true });

  if (error) {
    console.error("[api/usuarios/search]", error);
    return NextResponse.json(
      { error: "Erro ao consultar usuários" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, usuarios: data ?? [] });
}
