import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

type Body = {
  linkId: string;
  answers: Record<string, string>;
};


export async function POST(req: Request) {
  const cookieStore = await cookies();
  
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {
          // noop
        },
      },
    },
  );

  const {
    data: { user },
    error: userErr,
  } = await supabaseAuth.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const { data: usuario, error: usuarioError } = await supabaseAuth
    .from("usuarios")
    .select("id, cliente_id, ativo")
    .eq("id", user.id)
    .single();

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

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

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

  if (contrato.cliente_id !== usuario.cliente_id) {
    return NextResponse.json(
      { error: "link_cliente_nao_corresponde" },
      { status: 403 },
    );
  }

  const maxRespostas = Number(link.max_respostas ?? 0);
  const usadas = Number(link.usadas ?? 0);
  if (maxRespostas > 0 && usadas >= maxRespostas) {
    return NextResponse.json(
      { error: "limite_maximo_alcancado" },
      { status: 403 },
    );
  }

  const { data: existingLinkBind, error: bindError } = await supabaseAdmin
    .from("copsoq_aplicacoes_links")
    .select("id, aplicacao_id")
    .eq("link_id", linkId)
    .eq("usuario_id", user.id)
    .maybeSingle();

  if (bindError) {
    return NextResponse.json({ error: bindError.message }, { status: 500 });
  }

  const { data: org, error: orgError } = await supabaseAdmin
    .from("usuario_organizacao")
    .select("departamento_id, setor_id")
    .eq("usuario_id", user.id)
    .eq("ativo", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (orgError) {
    return NextResponse.json({ error: orgError.message }, { status: 500 });
  }

  if (!org?.departamento_id || !org?.setor_id) {
    return NextResponse.json(
      {
        error: "usuario_nao_vinculado_departamento_setor",
      },
      { status: 403 },
    );
  }

  if (existingLinkBind?.aplicacao_id) {
    const { data: app, error: appError } = await supabaseAdmin
      .from("copsoq_aplicacoes")
      .select("id, status")
      .eq("id", existingLinkBind.aplicacao_id)
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
  }

  const itemScores = Object.entries(answers).reduce(
    (acc, [key, value]) => {
      const parsed = Number(value);
      acc[key] = Number.isFinite(parsed) ? parsed : null;
      return acc;
    },
    {} as Record<string, number | null>,
  );

  const payload = {
    usuario_id: user.id,
    cliente_id: usuario.cliente_id,
    contrato_id: link.contrato_id,
    link_id: linkId,
    departamento_id: org.departamento_id,
    setor_id: org.setor_id,
    status: "concluido",
    respostas: answers,
    scores_itens: itemScores,
    created_by: user.id,
  };

  let aplicacaoId: string | null = null;
  let shouldIncrementLinkCount = false;

  if (existingLinkBind?.aplicacao_id) {
    const { error: updateError } = await supabaseAdmin
      .from("copsoq_aplicacoes")
      .update({ ...payload, updated_by: user.id })
      .eq("id", existingLinkBind.aplicacao_id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    aplicacaoId = existingLinkBind.aplicacao_id;
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

  const { error: upsertLinkError } = await supabaseAdmin
    .from("copsoq_aplicacoes_links")
    .upsert(
      {
        link_id: linkId,
        usuario_id: user.id,
        aplicacao_id: aplicacaoId,
      },
      { onConflict: "link_id,usuario_id" }
    );

  if (upsertLinkError) {
    return NextResponse.json(
      { error: upsertLinkError.message },
      { status: 500 },
    );
  }

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
