import { createClient } from "npm:@supabase/supabase-js";

type AuthUserRow = {
  id: string;
  email?: string | null;
  phone?: string | null;
  email_confirmed_at?: string | null;
  phone_confirmed_at?: string | null;
};

type UsuarioRow = {
  id: string;
  pending_email?: string | null;
  pending_phone?: string | null;
};

const SUPABASE_URL = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
  );
}

const admin = createClient(
  SUPABASE_URL ?? "",
  SUPABASE_SERVICE_ROLE_KEY ?? "",
  {
    auth: { persistSession: false },
  },
);

async function handler(req: Request): Promise<Response> {
  // validate auth: accept either internal secret header or service role bearer
  const internalSecretHeader = req.headers.get("x-internal-secret");
  const authHeader =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  const INTERNAL_API_SECRET = Deno.env.get("INTERNAL_API_SECRET");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  const internalOk =
    INTERNAL_API_SECRET &&
    internalSecretHeader &&
    internalSecretHeader === INTERNAL_API_SECRET;
  const serviceOk = SERVICE_ROLE && authHeader && authHeader === SERVICE_ROLE;
  if (!internalOk && !serviceOk) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401,
    });
  }
  try {
    const POLL_LOOKBACK_MS = Number(
      Deno.env.get("POLL_LOOKBACK_MS") ?? "120000",
    );
    const LIMIT = Number(Deno.env.get("POLL_LIMIT") ?? "500");

    const since = new Date(Date.now() - POLL_LOOKBACK_MS).toISOString();
    const filter = `email_confirmed_at.gte.${since},phone_confirmed_at.gte.${since}`;

    const result = await admin
      .from("auth.users")
      .select("id, email, phone, email_confirmed_at, phone_confirmed_at")
      .or(filter)
      .limit(LIMIT);

    const data = result.data as AuthUserRow[] | null;
    const error = result.error;

    if (error) {
      return new Response(JSON.stringify({ ok: false, error: String(error) }), {
        status: 500,
      });
    }

    let processed = 0;
    if (Array.isArray(data)) {
      for (const u of data) {
        try {
          const authUserId = String(u.id);

          // resolve usuario id
          let usuarioId: string | null = null;
          const directRes = await admin
            .from("usuarios")
            .select("id")
            .eq("id", authUserId)
            .limit(1)
            .maybeSingle();
          const directData = directRes.data as { id?: string } | null;
          if (directData && directData.id) usuarioId = directData.id;

          if (!usuarioId) {
            const mappingRes = await admin
              .from("usuario_auth_identities")
              .select("usuario_id")
              .eq("auth_user_id", authUserId)
              .limit(1)
              .maybeSingle();
            const mappingData = mappingRes.data as {
              usuario_id?: string;
            } | null;
            if (mappingData && mappingData.usuario_id)
              usuarioId = mappingData.usuario_id;
          }

          if (!usuarioId) continue;

          const usuarioRes = await admin
            .from("usuarios")
            .select("id, pending_email, pending_phone")
            .eq("id", usuarioId)
            .maybeSingle();
          const usuario = usuarioRes.data as UsuarioRow | null;
          if (!usuario) continue;

          // email
          if (u.email_confirmed_at) {
            const confirmedEmail = String(u.email ?? "");
            const pending = usuario.pending_email ?? null;
            if (pending && pending === confirmedEmail) {
              await admin
                .from("usuarios")
                .update({
                  email: pending,
                  pending_email: null,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", usuarioId);
              processed++;
            }
          }

          // phone
          if (u.phone_confirmed_at) {
            const confirmedPhone = String(u.phone ?? "");
            const pending = usuario.pending_phone ?? null;
            if (pending && pending === confirmedPhone) {
              await admin
                .from("usuarios")
                .update({
                  telefone: pending,
                  pending_phone: null,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", usuarioId);
              processed++;
            }
          }
        } catch (err) {
          console.error("process user error", err);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, processed }), {
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
    });
  }
}

export default handler;
