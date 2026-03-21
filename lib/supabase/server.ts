import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.SUPABASE_URL!, // Nome exato do seu Secret
    process.env.SUPABASE_ANON_KEY!, // Nome exato do seu Secret
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // O Middleware lida com isso se as ações forem chamadas de Server Components
          }
        },
      },
    },
  );
}
