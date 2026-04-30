import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookies) =>
          cookies.forEach((c) => res.cookies.set(c.name, c.value, c.options)),
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = req.nextUrl.pathname;

  /* =====================================================
     🔒 BLOQUEIO DE ROTAS PROTEGIDAS
  ===================================================== */

  if (!user && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  // 🔒 Bloqueio de área admin
  if (
    pathname.startsWith("/dashboard/admin") &&
    user?.app_metadata?.claims?.role !== "admin"
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  /* =====================================================
     🔒 USUÁRIO INATIVO
  ===================================================== */

  if (user) {
    const ativo = user.app_metadata?.ativo;

    if (ativo === false) {
      // logout limpo pelo Supabase
      await supabase.auth.signOut();

      const redirect = NextResponse.redirect(new URL("/login", req.url));

      return redirect;
    }
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
