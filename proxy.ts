// proxy.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

type Role = "admin" | "cliente" | "gestor" | "usuario" | null;
type Plano = "express" | "premium" | null;

export async function proxy(req: NextRequest) {
  const res = NextResponse.next();
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
    data: { user },
  } = await supabase.auth.getUser();

  const needsAuth =
    pathname.startsWith("/dashboard") || pathname.startsWith("/api/copsoq");

  const fullPath = pathname + search;

  const safeRedirect = fullPath.startsWith("/dashboard")
    ? fullPath
    : "/dashboard";

  // ✅ NÃO LOGADO
  if (!user && needsAuth) {
    const redirectTo = `/login?redirect=${encodeURIComponent(safeRedirect)}`;
    return NextResponse.redirect(new URL(redirectTo, req.url));
  }

  // ✅ LOGADO → valida perfil
  if (user) {
    const { data: profile } = await supabase
      .from("usuarios")
      .select("ativo, tipo_plano, role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.ativo === false) {
      const redirect = NextResponse.redirect(new URL("/login", req.url));

      redirect.cookies.delete("sb-access-token");
      redirect.cookies.delete("sb-refresh-token");

      return redirect;
    }

    const plano = profile.tipo_plano as Plano;
    const role = profile.role as Role;

    const basePath =
      plano === "express"
        ? "/dashboard/express"
        : plano === "premium"
          ? "/dashboard/premium"
          : "/dashboard";

    const isAdmin = role === "admin";

    // ✅ API EXPRESS ONLY
    if (pathname.startsWith("/api/copsoq")) {
      if (!isAdmin && plano !== "express") {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
      return res;
    }

    // ✅ BLOQUEIO POR PLANO (UI)
    if (!isAdmin) {
      if (pathname.startsWith("/dashboard/express") && plano !== "express") {
        return NextResponse.redirect(new URL(basePath, req.url));
      }

      if (pathname.startsWith("/dashboard/premium") && plano !== "premium") {
        return NextResponse.redirect(new URL(basePath, req.url));
      }
    }

    // ✅ ADMIN AREA
    if (pathname.startsWith("/dashboard/admin")) {
      if (isAdmin) return res;

      // exceção: usuarios pode ser visto por cliente/gestor
      if (
        pathname.startsWith("/dashboard/admin/usuarios") &&
        (role === "cliente" || role === "gestor")
      ) {
        return res;
      }

      return NextResponse.redirect(new URL(basePath, req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/copsoq/:path*"],
};
