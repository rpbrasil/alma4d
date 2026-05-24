// src/lib/supabase/browser.ts
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// guard global para sobreviver a HMR em dev (padrão tipo "Prisma singleton")
const globalForSupabase = globalThis as unknown as {
  __supabaseBrowserClient?: SupabaseClient;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase ENV não configurada (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)",
  );
}
export const supabaseBrowser =
  globalForSupabase.__supabaseBrowserClient ??
  createBrowserClient(supabaseUrl, supabaseAnonKey, {
    isSingleton: true,
  });

// em dev, salva no global para evitar recriar em hot reload
if (process.env.NODE_ENV !== "production") {
  globalForSupabase.__supabaseBrowserClient = supabaseBrowser;
}
