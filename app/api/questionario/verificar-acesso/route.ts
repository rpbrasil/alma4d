import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCaller } from "../../importacao-usuarios/_shared/getCaller";

export async function POST(req: Request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  let caller;

  try {
    caller = await getCaller(req, supabaseAdmin);
  } catch (e) {
    const code = e instanceof Error ? e.message : "UNKNOWN";
    return NextResponse.json({ error: code }, { status: 401 });
  }

  const usuarioId = caller.id;

  // ✅ busca contrato ativo do cliente
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

  // ✅ verifica se há vaga elegível
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

  // ✅ permitido
  return NextResponse.json({
    permitido: true,
    contrato_id: contrato.id,
  });
}
