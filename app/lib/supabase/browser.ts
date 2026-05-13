// src/lib/supabase/browser.ts
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// guard global para sobreviver a HMR em dev (padrão tipo "Prisma singleton")
const globalForSupabase = globalThis as unknown as {
  __supabaseBrowserClient?: SupabaseClient;
};

export const supabaseBrowser =
  globalForSupabase.__supabaseBrowserClient ??
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // força reutilização quando aplicável
      isSingleton: true,
    },
  );

// em dev, salva no global para evitar recriar em hot reload
if (process.env.NODE_ENV !== "production") {
  globalForSupabase.__supabaseBrowserClient = supabaseBrowser;
}
