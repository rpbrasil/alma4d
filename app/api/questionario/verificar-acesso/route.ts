import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getCaller } from "../../importacao-usuarios/_shared/getCaller";

export async function POST(req: Request) {
  const cookieStore = await cookies();

  // Cookie-based SSR client — the one getCaller needs to resolve the session
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
      },
    },
  );

  const supabaseAdmin = getSupabaseAdmin();

  let caller;
  try {
    caller = await getCaller(req, supabaseAuth);
  } catch (e) {
    const code = e instanceof Error ? e.message : "UNKNOWN";
    const statusMap: Record<string, number> = {
      NO_TOKEN: 401,
      INVALID_TOKEN: 401,
      NO_USER: 403,
      NO_PERMISSION: 403,
      INVALID_PLAN: 403,
      CLIENT_INACTIVE: 403,
    };
    return NextResponse.json(
      { error: code },
      { status: statusMap[code] ?? 401 },
    );
  }

  const usuarioId = caller.id;

  // busca contrato ativo do cliente
  const { data: contrato } = await supabaseAdmin
    .from("contratos")
    .select("id")
    .eq("cliente_id", caller.cliente_id)
    .eq("status", "ativo")
    .maybeSingle();

  if (!contrato) {
    return NextResponse.json(
      {
        permitido: false,
        motivo: "SEM_CONTRATO_ATIVO",
        message: "Nenhum contrato ativo encontrado.",
      },
      { status: 403 },
    );
  }

  // verifica se há vaga elegível
  const { data: vaga } = await supabaseAdmin
    .from("questionario_vagas")
    .select("id")
    .eq("contrato_id", contrato.id)
    .eq("usuario_id", usuarioId)
    .eq("status", "elegivel")
    .maybeSingle();

  if (!vaga) {
    return NextResponse.json(
      {
        permitido: false,
        motivo: "SEM_VAGA",
        message: "Você já respondeu o questionário ou não está na lista atual.",
      },
      { status: 403 },
    );
  }

  return NextResponse.json({
    permitido: true,
    contrato_id: contrato.id,
  });
}
