import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCaller } from "../_shared/getCaller";
import { getResumoVagasContrato } from "../_shared/vagas";

export async function POST(req: Request) {
  // ✅ parse body
  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const { contrato_id, usuario_ids } = body;

  if (!contrato_id || !Array.isArray(usuario_ids)) {
    return NextResponse.json(
      { error: "contrato_id e usuario_ids obrigatórios" },
      { status: 400 },
    );
  }

  // ✅ env
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

  // ✅ auth
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

  // ✅ multi-tenant proteção
  const { data: contrato } = await supabaseAdmin
    .from("contratos")
    .select("id, cliente_id")
    .eq("id", contrato_id)
    .maybeSingle();

  if (!contrato) {
    return NextResponse.json(
      { error: "Contrato não encontrado" },
      { status: 404 },
    );
  }

  if (
    caller.role !== "admin" &&
    String(contrato.cliente_id) !== String(caller.cliente_id)
  ) {
    return NextResponse.json(
      { error: "Contrato de outro tenant" },
      { status: 403 },
    );
  }

  // ✅ resumo de vagas
  const resumo = await getResumoVagasContrato(supabaseAdmin, contrato_id);

  // ✅ remove duplicados do payload
  const usuarioIdsUnicos = Array.from(new Set(usuario_ids));

  // ✅ verifica já elegíveis
  const { data: jaElegiveis } = await supabaseAdmin
    .from("questionario_vagas")
    .select("usuario_id")
    .eq("contrato_id", contrato_id)
    .eq("status", "elegivel")
    .in("usuario_id", usuarioIdsUnicos);

  const jaSet = new Set((jaElegiveis ?? []).map((r) => String(r.usuario_id)));

  // ✅ só novos consomem vaga
  const novos = usuarioIdsUnicos.filter((id) => !jaSet.has(String(id)));

  // ✅ BLOQUEIO PRINCIPAL
  if (novos.length > resumo.restantes) {
    return NextResponse.json(
      {
        error: "LIMITE_VAGAS_EXCEDIDO",
        message:
          `Você tem ${resumo.restantes} vaga(s) disponível(is), ` +
          `mas tentou adicionar ${novos.length}.`,
        resumo_vagas: resumo,
        tentativa_novos: novos.length,
      },
      { status: 409 },
    );
  }

  // ✅ inserir vagas
  if (novos.length > 0) {
    const inserts = novos.map((usuario_id) => ({
      contrato_id,
      usuario_id,
      status: "elegivel",
      origem: "upload_api",
    }));

    const { error: insertErr } = await supabaseAdmin
      .from("questionario_vagas")
      .insert(inserts);

    if (insertErr) {
      return NextResponse.json(
        {
          error: "ERRO_AO_INSERIR",
          message: insertErr.message,
        },
        { status: 500 },
      );
    }
  }

  // ✅ resposta final
  return NextResponse.json({
    ok: true,
    vagas_adicionadas: novos.length,
    resumo_vagas: resumo,
  });
}