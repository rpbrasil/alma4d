import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCaller } from "@/api/importacao-usuarios/_shared/getCaller";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const contratoId = searchParams.get("contrato_id");

  if (!contratoId) {
    return NextResponse.json(
      { error: "contrato_id obrigatório" },
      { status: 400 },
    );
  }

  // ✅ env check
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return NextResponse.json(
      { error: "Configuração do servidor inválida" },
      { status: 500 },
    );
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  // ✅ autenticação
  let caller;
  try {
    caller = await getCaller(req, supabaseAdmin);
  } catch (e) {
    const code = e instanceof Error ? e.message : "UNKNOWN";

    const map: Record<string, number> = {
      NO_TOKEN: 401,
      INVALID_TOKEN: 401,
      NO_PERMISSION: 403,
      INVALID_PLAN: 403,
      CLIENT_INACTIVE: 403,
    };

    return NextResponse.json(
      { error: code, message: code },
      { status: map[code] ?? 400 },
    );
  }

  // ✅ contrato
  const { data: contrato, error: contratoError } = await supabaseAdmin
    .from("contratos")
    .select("id, cliente_id, limite_usuarios")
    .eq("id", contratoId)
    .maybeSingle();

  if (contratoError || !contrato) {
    return NextResponse.json(
      { error: "Contrato não encontrado" },
      { status: 404 },
    );
  }

  // ✅ multi-tenant
  if (
    caller.role !== "admin" &&
    String(contrato.cliente_id) !== String(caller.cliente_id)
  ) {
    return NextResponse.json(
      { error: "Acesso a contrato de outro tenant" },
      { status: 403 },
    );
  }

  const limite = Number(contrato.limite_usuarios ?? 0);

  // ✅ contagens otimistas (3 queries leves)
  const [{ count: elegiveis }, { count: respondidos }, { count: removidos }] =
    await Promise.all([
      supabaseAdmin
        .from("questionario_vagas")
        .select("id", { count: "exact", head: true })
        .eq("contrato_id", contratoId)
        .eq("status", "elegivel"),

      supabaseAdmin
        .from("questionario_vagas")
        .select("id", { count: "exact", head: true })
        .eq("contrato_id", contratoId)
        .eq("status", "respondido"),

      supabaseAdmin
        .from("questionario_vagas")
        .select("id", { count: "exact", head: true })
        .eq("contrato_id", contratoId)
        .eq("status", "removido"),
    ]);

  const eleg = elegiveis ?? 0;
  const resp = respondidos ?? 0;
  const rem = removidos ?? 0;

  const restantes = Math.max(0, limite - eleg - resp);

  return NextResponse.json({
    contrato_id: contratoId,
    limite,
    elegiveis: eleg,
    respondidos: resp,
    removidos: rem,
    restantes,
  });
}
