import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

type Role = "admin" | "cliente" | "gestor" | "usuario" | null;
type Plano = "express" | "premium" | null;

const ADMIN_TENANT_COOKIE = "alma4d_admin_tenant_id";

function redirectWithCookies(res: NextResponse, url: URL) {
  const redirect = NextResponse.redirect(url);

  res.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie);
  });

  return redirect;
}

function isUuid(value: string | null | undefined): value is string {
  if (!value) return false;

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

// Edge-safe base64url decoder
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
  plano: Plano;
  clienteId: string | null;
  gestorId: string | null;
  ativo: boolean | null;
} {
  if (!accessToken) {
    return {
      role: null,
      plano: null,
      clienteId: null,
      gestorId: null,
      ativo: null,
    };
  }

  const payload = decodeJwtPayload(accessToken);

  if (!payload) {
    return {
      role: null,
      plano: null,
      clienteId: null,
      gestorId: null,
      ativo: null,
    };
  }

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

  const gestorId =
    typeof payload.user_gestor_id === "string" ? payload.user_gestor_id : null;

  const ativo =
    typeof payload.user_ativo === "boolean" ? payload.user_ativo : null;

  return {
    role,
    plano,
    clienteId,
    gestorId,
    ativo,
  };
}

function buildBasePath(plano: Plano) {
  if (plano === "express") return "/dashboard/express";
  if (plano === "premium") return "/dashboard/premium";
  return "/dashboard";
}

export async function proxy(req: NextRequest) {
  const requestHeaders = new Headers(req.headers);
  const res = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const { pathname, search } = req.nextUrl;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach((c) => res.cookies.set(c.name, c.value, c.options));
        },
      },
    },
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user ?? null;

  const needsAuth =
    pathname.startsWith("/dashboard") || pathname.startsWith("/api/copsoq");

  const fullPath = pathname + search;
  const safeRedirect = fullPath.startsWith("/dashboard")
    ? fullPath
    : "/dashboard";

  // -----------------------------------------
  // NÃO LOGADO
  // -----------------------------------------
  if (!user && needsAuth) {
    return redirectWithCookies(
      res,
      new URL(`/login?redirect=${encodeURIComponent(safeRedirect)}`, req.url),
    );
  }

  // -----------------------------------------
  // LOGADO
  // -----------------------------------------
  if (user) {
    const claims = parseJwtClaims(session?.access_token);

    const role = claims.role;
    const plano = claims.plano;
    const ativo = claims.ativo;
    const userClienteId = claims.clienteId;

    const isAdmin = role === "admin";
    
    if (ativo === false) {
      return redirectWithCookies(res, new URL("/login", req.url));
    }

    // tenant scope efetivo
    const scopedTenantIdRaw =
      req.cookies.get(ADMIN_TENANT_COOKIE)?.value ?? null;
    const adminScopedTenantId = isUuid(scopedTenantIdRaw)
      ? scopedTenantIdRaw
      : null;

    // usuário normal sempre usa o cliente do JWT
    // admin usa tenant scope se houver; senão continua com acesso global/admin
    const effectiveTenantId = isAdmin ? adminScopedTenantId : userClienteId;

    const adminIsScoped = isAdmin && !!adminScopedTenantId;

    const basePath = buildBasePath(plano);

    // -----------------------------------------
    // Injetar headers para uso server-side
    // -----------------------------------------
    requestHeaders.set("x-alma4d-role", role ?? "");
    requestHeaders.set("x-alma4d-plano", plano ?? "");
    requestHeaders.set("x-alma4d-user-cliente-id", userClienteId ?? "");
    requestHeaders.set("x-alma4d-effective-tenant-id", effectiveTenantId ?? "");
    requestHeaders.set("x-alma4d-admin-scoped", adminIsScoped ? "1" : "0");

    // -----------------------------------------
    // API EXPRESS ONLY
    // -----------------------------------------
    if (pathname.startsWith("/api/copsoq")) {
      if (!isAdmin && plano !== "express") {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }

      // admin scoped ou user normal autenticado passam
      return NextResponse.next({
        request: { headers: requestHeaders },
      });
    }

    // -----------------------------------------
    // ADMIN AREA
    // -----------------------------------------
    if (pathname.startsWith("/dashboard/admin")) {
      if (isAdmin) {
        return NextResponse.next({
          request: { headers: requestHeaders },
        });
      }

      // exceção mantida
      if (
        pathname.startsWith("/dashboard/admin/usuarios") &&
        (role === "cliente" || role === "gestor")
      ) {
        return NextResponse.next({
          request: { headers: requestHeaders },
        });
      }

      return redirectWithCookies(res, new URL(basePath, req.url));
    }

    // -----------------------------------------
    // ÁREAS DE PRODUTO
    // -----------------------------------------

    // Usuário não-admin continua restrito pelo próprio plano
    if (!isAdmin) {
      if (pathname.startsWith("/dashboard/express") && plano !== "express") {
        return redirectWithCookies(res, new URL(basePath, req.url));
      }

      if (pathname.startsWith("/dashboard/premium") && plano !== "premium") {
        return redirectWithCookies(res, new URL(basePath, req.url));
      }

      return NextResponse.next({
        request: { headers: requestHeaders },
      });
    }

    // -----------------------------------------
    // ADMIN fora da área admin:
    // melhor prática = exigir tenant scope prévio
    // -----------------------------------------
    if (
      isAdmin &&
      (pathname.startsWith("/dashboard/express") ||
        pathname.startsWith("/dashboard/premium"))
    ) {
      if (!adminScopedTenantId) {
        const url = new URL("/dashboard/admin/clientes", req.url);
        url.searchParams.set("modo", "selecionar-tenant");
        url.searchParams.set("redirect", fullPath);
        return redirectWithCookies(res, url);
      }

      return NextResponse.next({
        request: { headers: requestHeaders },
      });
    }
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/copsoq/:path*"],
};
