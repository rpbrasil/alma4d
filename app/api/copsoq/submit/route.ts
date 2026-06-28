import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

function normalizeRpcResult(u: unknown): string | null {
  if (u == null) return null;
  if (typeof u === "string") return u;
  if (typeof u === "number") return String(u);
  if (Array.isArray(u) && u.length > 0) {
    const first = u[0];
    return (
      (typeof first === "string" && first) ||
      first?.usuario_id ||
      first?.current_usuario_id ||
      null
    );
  }
  if (typeof u === "object") {
    const record = u as Record<string, unknown>;
    return (
      (typeof record.usuario_id === "string" && record.usuario_id) ||
      (typeof record.current_usuario_id === "string" &&
        record.current_usuario_id) ||
      null
    );
  }
  return null;
}

type Body = {
  linkId: string;
  answers: Record<string, string>;
  scaleScores?: Record<string, number | null>;
};

export async function POST(req: Request) {
  const supabaseAuth = await createServerSupabase();

  const {
    data: { user },
    error: userErr,
  } = await supabaseAuth.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  // Resolver usuario_id canônico via RPC
  const { data: usuarioRpcData, error: usuarioRpcErr } =
    await supabaseAuth.rpc("current_usuario_id");

  if (usuarioRpcErr) {
    return NextResponse.json({ error: usuarioRpcErr.message }, { status: 500 });
  }

  const usuarioId = normalizeRpcResult(usuarioRpcData);

  if (!usuarioId) {
    return NextResponse.json(
      { error: "usuario_nao_vinculado" },
      { status: 403 },
    );
  }

  const { data: usuario, error: usuarioError } = await supabaseAuth
    .from("usuarios")
    .select("id, cliente_id, ativo")
    .eq("id", usuarioId)
    .maybeSingle();

  if (usuarioError) {
    return NextResponse.json({ error: usuarioError.message }, { status: 500 });
  }

  if (!usuario || usuario.ativo === false || !usuario.cliente_id) {
    return NextResponse.json({ error: "inactive_user" }, { status: 403 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "json_invalido" }, { status: 400 });
  }

  const linkId =
    body.linkId && body.linkId !== "null" ? body.linkId.trim() : "";

  if (!linkId) {
    return NextResponse.json({ error: "linkId_obrigatorio" }, { status: 400 });
  }

  const answers = body.answers ?? {};
  if (typeof answers !== "object" || Array.isArray(answers)) {
    return NextResponse.json({ error: "answers_invalidas" }, { status: 400 });
  }

  const scaleScores = body.scaleScores ?? null;
  if (
    scaleScores !== null &&
    (typeof scaleScores !== "object" || Array.isArray(scaleScores))
  ) {
    return NextResponse.json(
      { error: "scaleScores_invalidos" },
      { status: 400 },
    );
  }

  const supabaseAdmin = getSupabaseAdmin();

  // 1) Link
  const { data: link, error: linkError } = await supabaseAdmin
    .from("copsoq_links")
    .select("id, contrato_id, max_respostas, usadas, ativo")
    .eq("id", linkId)
    .single();

  if (linkError || !link) {
    return NextResponse.json({ error: "link_nao_encontrado" }, { status: 404 });
  }

  if (!link.ativo) {
    return NextResponse.json({ error: "link_inativo" }, { status: 403 });
  }

  // 2) Contrato
  const { data: contrato, error: contratoError } = await supabaseAdmin
    .from("contratos")
    .select("id, cliente_id, status")
    .eq("id", link.contrato_id)
    .single();

  if (contratoError || !contrato) {
    return NextResponse.json(
      { error: "contrato_nao_encontrado" },
      { status: 404 },
    );
  }

  if (contrato.status !== "ativo") {
    return NextResponse.json({ error: "contrato_inativo" }, { status: 403 });
  }

  if (String(contrato.cliente_id) !== String(usuario.cliente_id)) {
    return NextResponse.json(
      { error: "link_cliente_nao_corresponde" },
      { status: 403 },
    );
  }

  // 3) Limite do link
  //const maxRespostas = Number(link.max_respostas ?? 0);
  const usadas = Number(link.usadas ?? 0);

  // if (maxRespostas > 0 && usadas >= maxRespostas) {
  //   return NextResponse.json(
  //     { error: "limite_maximo_alcancado" },
  //     { status: 403 },
  //   );
  // }

  // 4) Busca vínculo técnico ao link primeiro
  const { data: existingLinkBind, error: bindError } = await supabaseAdmin
    .from("copsoq_aplicacoes_links")
    .select("id, aplicacao_id")
    .eq("link_id", linkId)
    .eq("usuario_id", usuarioId)
    .maybeSingle();

  if (bindError) {
    return NextResponse.json({ error: bindError.message }, { status: 500 });
  }

  const existingAppId: string | null = existingLinkBind?.aplicacao_id ?? null;

  // 5) Se já existe aplicação vinculada, verifica status antes da vaga
  let shouldIncrementLinkCount = false;

  if (existingAppId) {
    const { data: app, error: appError } = await supabaseAdmin
      .from("copsoq_aplicacoes")
      .select("id, status")
      .eq("id", existingAppId)
      .single();

    if (appError) {
      return NextResponse.json({ error: appError.message }, { status: 500 });
    }

    if (app?.status === "concluido") {
      return NextResponse.json(
        {
          ok: true,
          message: "Questionário já concluído.",
          aplicacaoId: app.id,
        },
        { status: 200 },
      );
    }

    // havia aplicação, mas ainda não concluída -> ao concluir agora, conta uso
    shouldIncrementLinkCount = true;
  }

  // 6) Busca a vaga do usuário neste contrato/ciclo
  const { data: vagaAtual, error: vagaError } = await supabaseAdmin
    .from("questionario_vagas")
    .select("id, status")
    .eq("contrato_id", contrato.id)
    .eq("usuario_id", usuarioId)
    .in("status", ["elegivel", "respondido"])
    .maybeSingle();

  if (vagaError) {
    return NextResponse.json({ error: vagaError.message }, { status: 500 });
  }

  if (!vagaAtual) {
    return NextResponse.json(
      {
        error: "sem_vaga",
        message:
          "Você não está na lista atual de elegíveis para este questionário.",
      },
      { status: 403 },
    );
  }

  if (vagaAtual.status === "respondido") {
    return NextResponse.json(
      {
        ok: true,
        message: "Questionário já concluído.",
        aplicacaoId: existingAppId ?? null,
      },
      { status: 200 },
    );
  }

  // 7) A partir daqui, só segue se a vaga estiver elegível
  if (vagaAtual.status !== "elegivel") {
    return NextResponse.json(
      {
        error: "vaga_invalida",
        message: "A vaga do questionário não está elegível neste momento.",
      },
      { status: 403 },
    );
  }

  // 8) Organização
  const { data: org, error: orgError } = await supabaseAdmin
    .from("usuario_organizacao")
    .select("departamento_id, setor_id")
    .eq("usuario_id", usuarioId)
    .eq("ativo", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (orgError) {
    return NextResponse.json({ error: orgError.message }, { status: 500 });
  }

  // 9) Normaliza answers -> scores_itens
  const itemScores = Object.entries(answers).reduce(
    (acc, [key, value]) => {
      const parsed = Number(value);
      acc[key] = Number.isFinite(parsed) ? parsed : null;
      return acc;
    },
    {} as Record<string, number | null>,
  );

  const payload = {
    usuario_id: usuarioId,
    cliente_id: usuario.cliente_id,
    departamento_id: org?.departamento_id ?? null,
    setor_id: null,
    status: "concluido",
    respostas: answers,
    scores_itens: itemScores,
    scores_escalas: scaleScores,
    created_by: usuarioId,
  };

  let aplicacaoId: string | null = null;

  // 10) Atualiza ou cria aplicação
  if (existingAppId) {
    const { error: updateError } = await supabaseAdmin
      .from("copsoq_aplicacoes")
      .update({
        ...payload,
        updated_by: usuarioId,
      })
      .eq("id", existingAppId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    aplicacaoId = existingAppId;
  } else {
    const { data: insertData, error: insertError } = await supabaseAdmin
      .from("copsoq_aplicacoes")
      .insert(payload)
      .select("id")
      .single();

    if (insertError || !insertData?.id) {
      return NextResponse.json(
        { error: insertError?.message ?? "insert_error" },
        { status: 500 },
      );
    }

    aplicacaoId = insertData.id;
    shouldIncrementLinkCount = true;
  }

  // 11) Vincula aplicação ao link
  const { error: upsertLinkError } = await supabaseAdmin
    .from("copsoq_aplicacoes_links")
    .upsert(
      {
        link_id: linkId,
        usuario_id: usuarioId,
        aplicacao_id: aplicacaoId,
      },
      { onConflict: "link_id,usuario_id" },
    );

  if (upsertLinkError) {
    return NextResponse.json(
      { error: upsertLinkError.message },
      { status: 500 },
    );
  }

  // 12) Consome a vaga: elegivel -> respondido
  const { error: vagaConsumeError } = await supabaseAdmin
    .from("questionario_vagas")
    .update({
      status: "respondido",
      responded_at: new Date().toISOString(),
    })
    .eq("id", vagaAtual.id)
    .eq("status", "elegivel");

  if (vagaConsumeError) {
    return NextResponse.json(
      { error: vagaConsumeError.message },
      { status: 500 },
    );
  }

  // 13) Incrementa contador do link apenas na primeira conclusão efetiva
  if (shouldIncrementLinkCount) {
    const { error: updateLinkError } = await supabaseAdmin
      .from("copsoq_links")
      .update({ usadas: usadas + 1 })
      .eq("id", linkId);

    if (updateLinkError) {
      return NextResponse.json(
        { error: updateLinkError.message },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ ok: true, aplicacaoId });
}
