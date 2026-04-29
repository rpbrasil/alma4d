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

  // 🔒 Bloqueia acesso ao dashboard sem sessão
  if (!user && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (user) {
    const claims = user.app_metadata ?? {};
    const ativo = claims.ativo;

    // 🔒 Usuário inativo → logout forçado
    if (ativo === false) {
      const redirect = NextResponse.redirect(new URL("/login", req.url));

      // limpa cookies de sessão
      redirect.cookies.getAll().forEach((cookie) => {
        redirect.cookies.set(cookie.name, "", {
          path: "/",
          expires: new Date(0),
        });
      });

      return redirect;
    }
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
