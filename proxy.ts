import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

type Role = "admin" | "cliente" | "gestor" | "usuario" | null;
type Plano = "express" | "premium" | null;

const ADMIN_TENANT_COOKIE = "alma4d_admin_tenant_id";

function hasValidLinkId(search: string) {
  if (!search) return false;

  const params = new URLSearchParams(search);
  const linkId = params.get("linkId");

  return isUuid(linkId);
}

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
  return to;
}

function redirectWithCookies(
  res: NextResponse,
  url: URL,
  status?: 302 | 307 | 308,
) {
  const redirect = NextResponse.redirect(url, status);
  return copyCookies(res, redirect);
}

function nextWithCookies(res: NextResponse, headers: Headers) {
  const next = NextResponse.next({
    request: {
      headers,
    },
  });

  return copyCookies(res, next);
}

function jsonWithCookies(
  res: NextResponse,
  body: Record<string, unknown>,
  init?: ResponseInit,
) {
  const json = NextResponse.json(body, init);
  return copyCookies(res, json);
}

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

function buildDefaultLanding(role: Role, plano: Plano) {
  if (role === "admin") return "/dashboard/admin/clientes";

  if (plano === "premium") {
    return "/dashboard/premium";
  }

  if (plano === "express") {
    if (role === "usuario" || role === "gestor") {
      return "/dashboard/express/acesso-basico?step=1";
    }

    return "/dashboard/express";
  }

  return "/dashboard";
}

function isExpressRoute(pathname: string) {
  return pathname.startsWith("/dashboard/express");
}

function isPremiumRoute(pathname: string) {
  return pathname.startsWith("/dashboard/premium");
}

function isAdminRoute(pathname: string) {
  return pathname.startsWith("/dashboard/admin");
}

function isExpressAcessoBasico(pathname: string) {
  return pathname.startsWith("/dashboard/express/acesso-basico");
}

function isExpressCopsoq(pathname: string) {
  return pathname.startsWith("/dashboard/express/copsoq");
}

function isExpressParceiros(pathname: string) {
  return pathname.startsWith("/dashboard/express/parceiros");
}

function isExpressRelatorio(pathname: string) {
  return pathname.startsWith("/dashboard/express/relatorio-copsoq");
}

function isExpressDocumentos(pathname: string) {
  return pathname.startsWith("/dashboard/express/documentos");
}

function isExpressHome(pathname: string) {
  return pathname === "/dashboard/express";
}

function isPremiumHome(pathname: string) {
  return pathname === "/dashboard/premium";
}

function allowExpressRouteForRole(pathname: string, role: Role) {
  if (!role) return false;

  // rota especial
  if (isExpressAcessoBasico(pathname)) {
    return (
      role === "admin" ||
      role === "cliente" ||
      role === "gestor" ||
      role === "usuario"
    );
  }

  // questionário
  if (isExpressCopsoq(pathname)) {
    return false; // 🚨 bloqueia aqui, vamos tratar no middleware principal
  }


  // home express
  if (isExpressHome(pathname)) {
    return role === "admin" || role === "cliente";
  }

  // documentos
  if (isExpressDocumentos(pathname)) {
    return role === "admin" || role === "cliente";
  }

  // relatório
  if (isExpressRelatorio(pathname)) {
    return role === "admin" || role === "cliente";
  }

  // parceiros
  if (isExpressParceiros(pathname)) {
    return role === "admin";
  }

  // fallback geral express
  return role === "admin" || role === "cliente";
}

function allowPremiumRouteForRole(pathname: string, role: Role) {
  if (!role) return false;

  if (isPremiumHome(pathname)) {
    return role === "admin" || role === "cliente" || role === "gestor";
  }

  // todas as demais páginas premium seguem o mesmo conjunto por enquanto
  return role === "admin" || role === "cliente" || role === "gestor";
}

function allowAdminRouteForRole(pathname: string, role: Role) {
  if (!role) return false;

  // rotas admin exclusivas
  if (
    pathname.startsWith("/dashboard/admin/clientes") ||
    pathname.startsWith("/dashboard/admin/financeiro") ||
    pathname.startsWith("/dashboard/admin/deletar-usuario")
  ) {
    return role === "admin";
  }

  // exceção já prevista
  if (pathname.startsWith("/dashboard/admin/usuarios")) {
    return role === "admin" || role === "cliente" || role === "gestor";
  }

  // fallback admin
  return role === "admin";
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

    if (!role || !plano || ativo === null) {
      return redirectWithCookies(res, new URL("/login", req.url));
    }

    if (ativo === false) {
      return redirectWithCookies(res, new URL("/login", req.url));
    }

    const isAdmin = role === "admin";

    const scopedTenantIdRaw =
      req.cookies.get(ADMIN_TENANT_COOKIE)?.value ?? null;

    const adminScopedTenantId = isUuid(scopedTenantIdRaw)
      ? scopedTenantIdRaw
      : null;

    const effectiveTenantId = isAdmin ? adminScopedTenantId : userClienteId;
    const adminIsScoped = isAdmin && !!adminScopedTenantId;

    // headers úteis para server-side
    requestHeaders.set("x-alma4d-role", role ?? "");
    requestHeaders.set("x-alma4d-plano", plano ?? "");
    requestHeaders.set("x-alma4d-user-cliente-id", userClienteId ?? "");
    requestHeaders.set("x-alma4d-effective-tenant-id", effectiveTenantId ?? "");
    requestHeaders.set("x-alma4d-admin-scoped", adminIsScoped ? "1" : "0");

    const landing = buildDefaultLanding(role, plano);

    // -----------------------------------------
    // /dashboard -> landing por role/plano
    // -----------------------------------------
    if (pathname === "/dashboard") {
      return redirectWithCookies(res, new URL(landing, req.url));
    }

    // -----------------------------------------
    // API EXPRESS
    // -----------------------------------------
    if (pathname.startsWith("/api/copsoq")) {
      if (plano !== "express") {
        return jsonWithCookies(res, { error: "forbidden" }, { status: 403 });
      }

      // admin em área de produto precisa ter tenant scope
      // if (isAdmin && !adminScopedTenantId) {
      //   return jsonWithCookies(
      //     res,
      //     { error: "tenant_scope_required" },
      //     { status: 403 },
      //   );
      // }

      if (
        role === "usuario" ||
        role === "gestor" ||
        role === "cliente" ||
        role === "admin"
      ) {
        return nextWithCookies(res, requestHeaders);
      }

      return jsonWithCookies(res, { error: "forbidden" }, { status: 403 });
    }

    // -----------------------------------------
    // ADMIN AREA
    // -----------------------------------------
    if (isAdminRoute(pathname)) {
      if (allowAdminRouteForRole(pathname, role)) {
        return nextWithCookies(res, requestHeaders);
      }

      return redirectWithCookies(res, new URL(landing, req.url));
    }

    // -----------------------------------------
    // EXPRESS AREA
    // -----------------------------------------
    if (isExpressRoute(pathname)) {
      if (plano !== "express") {
        return redirectWithCookies(res, new URL(landing, req.url));
      }

      // ✅ admin pode navegar livremente (sem tenant)
      // (mantemos tenant scope só se você quiser restrição mais forte no futuro)
      if (isAdmin) {
        return nextWithCookies(res, requestHeaders);
      }

      // -----------------------------------------
      // COPSOQ - controle de acesso rigoroso
      // -----------------------------------------
      if (isExpressCopsoq(pathname)) {
        // admin pode acessar livremente
        if (isAdmin) {
          return nextWithCookies(res, requestHeaders);
        }

        // precisa de linkId válido
        if (!hasValidLinkId(search)) {
          const url = new URL("/dashboard/express/acesso-basico", req.url);
          url.searchParams.set("step", "3");

          return redirectWithCookies(res, url);
        }

        return nextWithCookies(res, requestHeaders);
      }

      if (allowExpressRouteForRole(pathname, role)) {
        return nextWithCookies(res, requestHeaders);
      }

      // usuario/gestor express caem no canal seguro
      if (role === "usuario" || role === "gestor") {
        const url = new URL("/dashboard/express/acesso-basico", req.url);
        url.searchParams.set("step", "1"); // ✅ onboarding começa aqui
        return redirectWithCookies(res, url);
      }
      return redirectWithCookies(res, new URL(landing, req.url));
    }

    // -----------------------------------------
    // PREMIUM AREA
    // -----------------------------------------
    if (isPremiumRoute(pathname)) {
      if (plano !== "premium") {
        return redirectWithCookies(res, new URL(landing, req.url));
      }

      if (isAdmin && !adminScopedTenantId) {
        const url = new URL("/dashboard/admin/clientes", req.url);
        url.searchParams.set("modo", "selecionar-tenant");
        url.searchParams.set("redirect", fullPath);
        return redirectWithCookies(res, url);
      }

      if (allowPremiumRouteForRole(pathname, role)) {
        return nextWithCookies(res, requestHeaders);
      }

      return redirectWithCookies(res, new URL(landing, req.url));
    }

    // -----------------------------------------
    // Outras rotas autenticadas genéricas
    // -----------------------------------------
    return nextWithCookies(res, requestHeaders);
  }

  return nextWithCookies(res, requestHeaders);
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/copsoq/:path*"],
};
