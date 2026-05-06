import "server-only";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

export async function createServerSupabase() {
  // Mantive exatamente como você está usando (NEXT_PUBLIC_*), pois é compatível com o guia SSR.
  // Se preferir, pode trocar por SUPABASE_URL / SUPABASE_ANON_KEY (server-only).
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  const cookieStore = await cookies(); // Next 16: cookies() é async [1](https://nextjs.org/docs/app/api-reference/functions/cookies)

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Em alguns contextos (ex.: Server Components), escrita pode ser bloqueada.
          // Fluxos com proxy/middleware lidam com refresh/persistência. [2](https://supabase.com/docs/guides/auth/server-side/creating-a-client)[3](https://github.com/supabase/ssr/blob/main/src/createServerClient.ts)
        }
      },
    },
  });
}

export type ServerSupabaseClient = Awaited<
  ReturnType<typeof createServerSupabase>
>;
