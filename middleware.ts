import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const { pathname } = req.nextUrl;

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

  /* =====================================================
     🔒 BLOQUEIO DE ROTAS PROTEGIDAS
  ===================================================== */

  if (!user && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  /* =====================================================
     🔒 USUÁRIO INATIVO (checagem real no banco)
  ===================================================== */

  if (user) {
    const { data: profile } = await supabase
      .from("usuarios")
      .select("ativo")
      .eq("id", user.id)
      .single();

    if (profile?.ativo === false) {
      const redirect = NextResponse.redirect(new URL("/login", req.url));

      // limpa sessão manualmente
      redirect.cookies.delete("sb-access-token");
      redirect.cookies.delete("sb-refresh-token");

      return redirect;
    }
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
