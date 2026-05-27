import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const ADMIN_TENANT_COOKIE = "alma4d_admin_tenant_id";

type Role = "admin" | "cliente" | "gestor" | "usuario" | null;

type JwtClaims = {
  user_role?: Role;
  user_ativo?: boolean | null;
};

function isUuid(value: string | null | undefined): value is string {
  if (!value) return false;

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "=",
    );

    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function parseJwtClaims(accessToken: string | null | undefined): {
  role: Role;
  ativo: boolean | null;
} {
  if (!accessToken) return { role: null, ativo: null };

  const payload = decodeJwtPayload(accessToken);

  if (!payload) return { role: null, ativo: null };

  const role =
    payload.user_role === "admin" ||
    payload.user_role === "cliente" ||
    payload.user_role === "gestor" ||
    payload.user_role === "usuario"
      ? (payload.user_role as Role)
      : null;

  const ativo =
    typeof payload.user_ativo === "boolean" ? payload.user_ativo : null;

  return { role, ativo };
}

function buildSupabaseFromRequest(req: Request, res: NextResponse) {
  const request = req as unknown as { headers: Headers };

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const cookieHeader = request.headers.get("cookie") ?? "";
          return cookieHeader
            .split(";")
            .map((part) => part.trim())
            .filter(Boolean)
            .map((pair) => {
              const index = pair.indexOf("=");
              const name = index >= 0 ? pair.slice(0, index) : pair;
              const value = index >= 0 ? pair.slice(index + 1) : "";
              return { name, value };
            });
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach((c) => {
            res.cookies.set(c.name, c.value, c.options);
          });
        },
      },
    },
  );
}

export async function POST(req: Request) {
  const res = NextResponse.json({ ok: true });

  const supabase = buildSupabaseFromRequest(req, res);
  const adminDb = getSupabaseAdmin();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user ?? null;
  const claims = parseJwtClaims(session?.access_token);

  if (!user || claims.role !== "admin" || claims.ativo === false) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: { tenantId?: string | null; redirect?: string | null } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const tenantId = body.tenantId ?? null;
  const redirect = body.redirect ?? null;

  if (!isUuid(tenantId)) {
    return NextResponse.json({ error: "invalid_tenant_id" }, { status: 400 });
  }

  const { data: tenant, error } = await adminDb
    .from("clientes")
    .select("id, ativo")
    .eq("id", tenantId)
    .maybeSingle();

  if (error || !tenant) {
    return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
  }

  if (tenant.ativo === false) {
    return NextResponse.json({ error: "tenant_inactive" }, { status: 403 });
  }

  const response = redirect
    ? NextResponse.redirect(new URL(redirect, req.url))
    : NextResponse.json({ ok: true, tenantId });

  response.cookies.set({
    name: ADMIN_TENANT_COOKIE,
    value: tenantId,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8, // 8h
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });

  response.cookies.set({
    name: ADMIN_TENANT_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}