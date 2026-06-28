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

function isValidUrl(val: string | null): boolean {
  if (!val) return true; // null/empty = clear, always valid
  try {
    new URL(val);
    return true;
  } catch {
    return false;
  }
}

async function resolveClaims(allowedRoles: string[] = ["cliente"]) {
  const supabase = await createServerSupabase();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return { error: "not_authenticated", status: 401 };

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const claims = parseJwt(session?.access_token);

  if (!claims || claims.ativo !== true)
    return { error: "user_inactive", status: 403 };
  if (!claims.role || !allowedRoles.includes(claims.role))
    return { error: "access_denied", status: 403 };
  if (!claims.clienteId) return { error: "tenant_not_resolved", status: 403 };

  return { claims };
}

export async function GET() {
  try {
    const result = await resolveClaims(["cliente", "gestor", "usuario"]);
    if ("error" in result) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: result.status },
      );
    }

    const { data, error } = await getSupabaseAdmin()
      .from("clientes")
      .select("id, logo_url, menu_url, menu_label")
      .eq("id", result.claims.clienteId!)
      .single();

    if (error) {
      console.error("[api/clientes/configuracoes GET]", error);
      return NextResponse.json(
        { ok: false, error: "Erro ao buscar configurações" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, data });
  } catch (e) {
    console.error("[api/clientes/configuracoes GET] unexpected:", e);
    return NextResponse.json(
      { ok: false, error: "Erro interno" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const result = await resolveClaims();
    if ("error" in result) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: result.status },
      );
    }

    const body = (await req.json()) as Record<string, unknown>;

    const logo_url =
      body.logo_url === "" || body.logo_url == null
        ? null
        : typeof body.logo_url === "string"
          ? body.logo_url.trim()
          : null;

    const menu_url =
      body.menu_url === "" || body.menu_url == null
        ? null
        : typeof body.menu_url === "string"
          ? body.menu_url.trim()
          : null;

    const menu_label =
      body.menu_label === "" || body.menu_label == null
        ? null
        : typeof body.menu_label === "string"
          ? body.menu_label.trim().slice(0, 60)
          : null;

    if (!isValidUrl(logo_url)) {
      return NextResponse.json(
        { ok: false, error: "URL do logotipo inválida" },
        { status: 400 },
      );
    }
    if (!isValidUrl(menu_url)) {
      return NextResponse.json(
        { ok: false, error: "Link do menu inválido" },
        { status: 400 },
      );
    }

    const { data, error } = await getSupabaseAdmin()
      .from("clientes")
      .update({
        logo_url,
        menu_url,
        menu_label,
        updated_at: new Date().toISOString(),
      })
      .eq("id", result.claims.clienteId!)
      .select("id, logo_url, menu_url, menu_label")
      .single();

    if (error) {
      console.error("[api/clientes/configuracoes PATCH]", error);
      return NextResponse.json(
        { ok: false, error: "Erro ao salvar configurações" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, data });
  } catch (e) {
    console.error("[api/clientes/configuracoes PATCH] unexpected:", e);
    return NextResponse.json(
      { ok: false, error: "Erro interno" },
      { status: 500 },
    );
  }
}
