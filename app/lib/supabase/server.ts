import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

export async function createServerSupabase() {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const accessToken =
    headerStore.get("Authorization")?.replace("Bearer ", "") ||
    cookieStore.get("sb-access-token")?.value;

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: accessToken
          ? {
              Authorization: `Bearer ${accessToken}`,
            }
          : {},
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        },
      },
    },
  );
}
