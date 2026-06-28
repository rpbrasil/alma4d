import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getCaller } from "../_shared/getCaller";
import { getResumoVagasContrato } from "../_shared/vagas";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const { contrato_id, usuario_ids, departamento_id } = body;

  if (!contrato_id || !Array.isArray(usuario_ids)) {
    return NextResponse.json(
      { error: "contrato_id e usuario_ids obrigatórios" },
      { status: 400 },
    );
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return NextResponse.json(
      { error: "Configuração do servidor inválida" },
      { status: 500 },
    );
  }

  const supabaseAdmin = getSupabaseAdmin();

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

  // 1) contrato + tenant guard
  const { data: contrato, error: contratoError } = await supabaseAdmin
    .from("contratos")
    .select("id, cliente_id")
    .eq("id", contrato_id)
    .maybeSingle();

  if (contratoError) {
    return NextResponse.json(
      { error: "Erro ao buscar contrato", message: contratoError.message },
      { status: 500 },
    );
  }

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

  // 2) normaliza ids do payload
  const usuarioIdsUnicos = Array.from(
    new Set(
      usuario_ids.map((v: unknown) => String(v ?? "").trim()).filter(Boolean),
    ),
  );

  if (usuarioIdsUnicos.length === 0) {
    return NextResponse.json(
      { error: "Nenhum usuário válido informado" },
      { status: 400 },
    );
  }

  // 3) valida usuários do payload
  const { data: usuariosValidos, error: usuariosError } = await supabaseAdmin
    .from("usuarios")
    .select("id, cliente_id, ativo")
    .in("id", usuarioIdsUnicos);

  if (usuariosError) {
    return NextResponse.json(
      { error: "Erro ao validar usuários", message: usuariosError.message },
      { status: 500 },
    );
  }

  const usuarioIdsValidados = (usuariosValidos ?? [])
    .filter(
      (u) =>
        String(u.cliente_id) === String(contrato.cliente_id) &&
        u.ativo === true,
    )
    .map((u) => String(u.id));

  if (usuarioIdsValidados.length === 0) {
    return NextResponse.json(
      {
        error: "Nenhum usuário elegível encontrado para este cliente",
      },
      { status: 400 },
    );
  }

  // 4) se veio departamento_id, valida o departamento
  if (departamento_id) {
    const { data: departamento, error: departamentoError } = await supabaseAdmin
      .from("departamentos")
      .select("id, cliente_id")
      .eq("id", departamento_id)
      .maybeSingle();

    if (departamentoError) {
      return NextResponse.json(
        {
          error: "ERRO_AO_BUSCAR_DEPARTAMENTO",
          message: departamentoError.message,
        },
        { status: 500 },
      );
    }

    if (!departamento) {
      return NextResponse.json(
        { error: "Departamento não encontrado" },
        { status: 404 },
      );
    }

    if (String(departamento.cliente_id) !== String(contrato.cliente_id)) {
      return NextResponse.json(
        { error: "Departamento de outro tenant" },
        { status: 403 },
      );
    }
  }

  // 5) resumo atual
  const resumoAntes = await getResumoVagasContrato(supabaseAdmin, contrato_id);

  // 6) link ativo do COPSOQ
  const { data: activeLink, error: activeLinkError } = await supabaseAdmin
    .from("copsoq_links")
    .select("id")
    .eq("contrato_id", contrato_id)
    .eq("ativo", true)
    .maybeSingle();

  if (activeLinkError) {
    return NextResponse.json(
      {
        error: "ERRO_AO_BUSCAR_LINK_COPSOQ",
        message: activeLinkError.message,
      },
      { status: 500 },
    );
  }

  // 7) verifica quem já está elegível
  const { data: jaElegiveis, error: jaElegiveisError } = await supabaseAdmin
    .from("questionario_vagas")
    .select("usuario_id")
    .eq("contrato_id", contrato_id)
    .eq("status", "elegivel")
    .in("usuario_id", usuarioIdsValidados);

  if (jaElegiveisError) {
    return NextResponse.json(
      {
        error: "ERRO_AO_VERIFICAR_ELEGIVEIS",
        message: jaElegiveisError.message,
      },
      { status: 500 },
    );
  }

  const jaSet = new Set((jaElegiveis ?? []).map((r) => String(r.usuario_id)));
  const novos = usuarioIdsValidados.filter((id) => !jaSet.has(String(id)));

  if (novos.length > resumoAntes.restantes) {
    return NextResponse.json(
      {
        error: "LIMITE_VAGAS_EXCEDIDO",
        message:
          `Você tem ${resumoAntes.restantes} vaga(s) disponível(is), ` +
          `mas tentou adicionar ${novos.length}.`,
        resumo_vagas: resumoAntes,
        tentativa_novos: novos.length,
      },
      { status: 409 },
    );
  }

  // 8) inserir novas vagas
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

  // 9) sincronizar vínculo organizacional (opcional)
  //    Se não vier departamento_id, não cria org e tudo bem.
  if (departamento_id && usuarioIdsValidados.length > 0) {
    const { data: orgAtuais, error: orgAtuaisError } = await supabaseAdmin
      .from("usuario_organizacao")
      .select("id, usuario_id")
      .eq("ativo", true)
      .in("usuario_id", usuarioIdsValidados);

    if (orgAtuaisError) {
      return NextResponse.json(
        {
          error: "ERRO_AO_BUSCAR_ORGANIZACAO",
          message: orgAtuaisError.message,
        },
        { status: 500 },
      );
    }

    const orgByUser = new Map(
      (orgAtuais ?? []).map((row) => [String(row.usuario_id), row.id]),
    );

    const idsParaUpdate = usuarioIdsValidados
      .map((uid) => orgByUser.get(String(uid)))
      .filter(Boolean) as string[];

    const usuariosSemOrg = usuarioIdsValidados.filter(
      (uid) => !orgByUser.has(String(uid)),
    );

    if (idsParaUpdate.length > 0) {
      const { error: updateOrgError } = await supabaseAdmin
        .from("usuario_organizacao")
        .update({
          departamento_id,
          setor_id: null,
          ativo: true,
        })
        .in("id", idsParaUpdate);

      if (updateOrgError) {
        return NextResponse.json(
          {
            error: "ERRO_AO_ATUALIZAR_ORGANIZACAO",
            message: updateOrgError.message,
          },
          { status: 500 },
        );
      }
    }

    if (usuariosSemOrg.length > 0) {
      const insertsOrg = usuariosSemOrg.map((usuario_id) => ({
        usuario_id,
        departamento_id,
        setor_id: null,
        ativo: true,
      }));

      const { error: insertOrgError } = await supabaseAdmin
        .from("usuario_organizacao")
        .insert(insertsOrg);

      if (insertOrgError) {
        return NextResponse.json(
          {
            error: "ERRO_AO_INSERIR_ORGANIZACAO",
            message: insertOrgError.message,
          },
          { status: 500 },
        );
      }
    }
  }

  // 10) sincronizar vínculos técnicos do COPSOQ
  if (activeLink?.id && usuarioIdsValidados.length > 0) {
    const linkRows = usuarioIdsValidados.map((usuario_id) => ({
      link_id: activeLink.id,
      usuario_id,
      aplicacao_id: null,
    }));

    const { error: linkSyncError } = await supabaseAdmin
      .from("copsoq_aplicacoes_links")
      .upsert(linkRows, { onConflict: "link_id,usuario_id" });

    if (linkSyncError) {
      if (novos.length > 0) {
        await supabaseAdmin
          .from("questionario_vagas")
          .delete()
          .eq("contrato_id", contrato_id)
          .eq("status", "elegivel")
          .in("usuario_id", novos);
      }

      return NextResponse.json(
        {
          error: "COPSOQ_LINK_SYNC_FAILED",
          message: linkSyncError.message,
        },
        { status: 500 },
      );
    }
  }

  // 11) remoção: quem saiu da lista atual deixa de ficar elegível
  const { data: vagasElegiveisAtuais, error: vagasElegiveisAtuaisError } =
    await supabaseAdmin
      .from("questionario_vagas")
      .select("id, usuario_id, status")
      .eq("contrato_id", contrato_id)
      .eq("status", "elegivel");

  if (vagasElegiveisAtuaisError) {
    return NextResponse.json(
      {
        error: "ERRO_AO_BUSCAR_VAGAS_ATUAIS",
        message: vagasElegiveisAtuaisError.message,
      },
      { status: 500 },
    );
  }

  const payloadSet = new Set(usuarioIdsValidados.map(String));

  const vagasParaRemover = (vagasElegiveisAtuais ?? []).filter(
    (v) => !payloadSet.has(String(v.usuario_id)),
  );

  if (vagasParaRemover.length > 0) {
    const idsVagasParaRemover = vagasParaRemover.map((v) => v.id);
    const idsUsuariosRemovidos = vagasParaRemover.map((v) =>
      String(v.usuario_id),
    );

    const { error: removeVagasError } = await supabaseAdmin
      .from("questionario_vagas")
      .update({
        status: "removido",
      })
      .in("id", idsVagasParaRemover);

    if (removeVagasError) {
      return NextResponse.json(
        {
          error: "ERRO_AO_REMOVER_VAGAS",
          message: removeVagasError.message,
        },
        { status: 500 },
      );
    }

    // remove vínculo técnico do COPSOQ apenas se ainda não respondeu
    if (activeLink?.id && idsUsuariosRemovidos.length > 0) {
      const { error: removeLinkBindError } = await supabaseAdmin
        .from("copsoq_aplicacoes_links")
        .delete()
        .eq("link_id", activeLink.id)
        .is("aplicacao_id", null)
        .in("usuario_id", idsUsuariosRemovidos);

      if (removeLinkBindError) {
        return NextResponse.json(
          {
            error: "ERRO_AO_REMOVER_VINCULO_COPSOQ",
            message: removeLinkBindError.message,
          },
          { status: 500 },
        );
      }
    }

    // opcional: desativar vínculo organizacional somente se você quiser limpar também
    // Aqui eu NÃO recomendo apagar usuario_organizacao, porque ele pode continuar útil
    // para o app mesmo fora do COPSOQ.
  }

  // 12) resumo atualizado
  const resumoAtualizado = await getResumoVagasContrato(
    supabaseAdmin,
    contrato_id,
  );

  return NextResponse.json({
    ok: true,
    vagas_adicionadas: novos.length,
    usuarios_sincronizados_copsoq: activeLink?.id
      ? usuarioIdsValidados.length
      : 0,
    usuarios_removidos: vagasParaRemover.length,
    link_copsoq_id: activeLink?.id ?? null,
    resumo_vagas: resumoAtualizado,
  });
}
