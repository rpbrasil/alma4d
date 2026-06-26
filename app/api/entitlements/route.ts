import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type AppMetadata = {
  user_role?: string;
  user_cliente_id?: string;
  user_ativo?: boolean;
  user_plano?: string;
};

function parseJwt(token: string | undefined | null) {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8"),
    ) as Record<string, unknown>;
    const meta = payload.app_metadata as AppMetadata | undefined;
    return {
      role: meta?.user_role ?? null,
      plano: meta?.user_plano ?? null,
      clienteId:
        typeof meta?.user_cliente_id === "string" ? meta.user_cliente_id : null,
      ativo: typeof meta?.user_ativo === "boolean" ? meta.user_ativo : null,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  // ✅ SSR cookie auth — mesma sessão do browser
  const cookieStore = await cookies();
  const supabaseSsr = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    },
  );

  const {
    data: { user },
    error: userError,
  } = await supabaseSsr.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Token ausente" }, { status: 401 });
  }

  const {
    data: { session },
  } = await supabaseSsr.auth.getSession();

  const claims = parseJwt(session?.access_token);

  if (!claims || claims.ativo !== true) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  // ✅ plano e cliente via JWT (evita round-trip ao DB para autenticação)
  if (claims.plano !== "express") {
    return NextResponse.json({ error: "Plano inválido" }, { status: 403 });
  }

  if (!claims.clienteId) {
    return NextResponse.json(
      { error: "Sem cliente vinculado" },
      { status: 403 },
    );
  }

  // ✅ valida cliente ativo
  const { data: cliente } = await supabase
    .from("clientes")
    .select("ativo")
    .eq("id", claims.clienteId)
    .single();

  if (!cliente?.ativo) {
    return NextResponse.json({ error: "Cliente inativo" }, { status: 403 });
  }

  const tenantId = claims.clienteId;

  // ✅ limite baseado no contrato ativo
  let limite_usuarios: number | null = null;

  const { data: contratoAtivo } = await supabase
    .from("contratos")
    .select("id, limite_usuarios")
    .eq("cliente_id", tenantId)
    .eq("status", "ativo")
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  limite_usuarios = contratoAtivo?.limite_usuarios ?? null;

  // ✅ vagas COPSOQ em uso (elegíveis + respondidos) — representa consumo real de licenças
  //    Licenças NÃO limitam o cadastro de usuários; só limitam vagas na pesquisa COPSOQ.
  let licencas_consumidas = 0;
  if (contratoAtivo?.id) {
    const [{ count: elegiveisCount }, { count: respondidosCount }] =
      await Promise.all([
        supabase
          .from("questionario_vagas")
          .select("id", { count: "exact", head: true })
          .eq("contrato_id", contratoAtivo.id)
          .eq("status", "elegivel"),
        supabase
          .from("questionario_vagas")
          .select("id", { count: "exact", head: true })
          .eq("contrato_id", contratoAtivo.id)
          .eq("status", "respondido"),
      ]);
    licencas_consumidas = (elegiveisCount ?? 0) + (respondidosCount ?? 0);
  }

  // ✅ usuários cadastrados — informativo, independente das licenças COPSOQ
  const { count: usuariosCadastrados } = await supabase
    .from("usuarios")
    .select("id", { count: "exact", head: true })
    .eq("cliente_id", tenantId)
    .eq("role", "usuario")
    .eq("ativo", true);

  return NextResponse.json({
    licencas_contratadas: limite_usuarios,
    licencas_consumidas,
    usuarios_cadastrados: usuariosCadastrados ?? 0,
  });
}
