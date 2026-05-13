// proxy.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

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
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/express/copsoq") ||
    pathname.startsWith("/api/copsoq");

  // ✅ construção clara do redirect
  const fullPath = pathname + search;

  // ✅ validação simples (evita open redirect)
  const safeRedirect = fullPath.startsWith("/dashboard")
    ? fullPath
    : "/dashboard";

  if (!user && needsAuth) {
    const redirectTo = `/login?redirect=${encodeURIComponent(safeRedirect)}`;
    return NextResponse.redirect(new URL(redirectTo, req.url));
  }

  if (user) {
    const { data: profile } = await supabase
      .from("usuarios")
      .select("ativo")
      .eq("id", user.id)
      .single();

    if (profile?.ativo === false) {
      const redirect = NextResponse.redirect(new URL("/login", req.url));
      redirect.cookies.delete("sb-access-token");
      redirect.cookies.delete("sb-refresh-token");
      return redirect;
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/express/copsoq/:path*",
    "/api/copsoq/:path*",
  ],
};
