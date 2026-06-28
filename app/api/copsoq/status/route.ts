import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

type Role = "admin" | "cliente" | "gestor" | "usuario" | null;
type Plano = "express" | "premium" | null;

type JwtClaims = {
  role: Role;
  plano: Plano;
  clienteId: string | null;
  ativo: boolean | null;
};

type AppMetadata = {
  user_role?: Role;
  user_plano?: Plano;
  user_cliente_id?: string;
  user_ativo?: boolean;
};

function parseJwtClaims(accessToken: string | null | undefined): JwtClaims {
  if (!accessToken) {
    return { role: null, plano: null, clienteId: null, ativo: null };
  }

  try {
    const parts = accessToken.split(".");
    if (parts.length !== 3) {
      return { role: null, plano: null, clienteId: null, ativo: null };
    }

    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8"),
    ) as Record<string, unknown>;

    const meta = payload.app_metadata as AppMetadata | undefined;

    const role =
      meta?.user_role === "admin" ||
      meta?.user_role === "cliente" ||
      meta?.user_role === "gestor" ||
      meta?.user_role === "usuario"
        ? meta.user_role
        : null;

    const plano =
      meta?.user_plano === "express" || meta?.user_plano === "premium"
        ? meta.user_plano
        : null;

    const clienteId =
      typeof meta?.user_cliente_id === "string" ? meta.user_cliente_id : null;

    const ativo =
      typeof meta?.user_ativo === "boolean" ? meta.user_ativo : null;

    return { role, plano, clienteId, ativo };
  } catch {
    return { role: null, plano: null, clienteId: null, ativo: null };
  }
}

function buildCopsoqResponderHref(linkId: string) {
  return `/express/copsoq?linkId=${encodeURIComponent(linkId)}`;
}

export async function GET() {
  try {
    const supabase = await createServerSupabase();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { ok: false, error: "not_authenticated" },
        { status: 401 },
      );
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const claims = parseJwtClaims(session?.access_token);

    if (claims.ativo !== true) {
      return NextResponse.json(
        { ok: false, error: "user_inactive_or_unresolved" },
        { status: 403 },
      );
    }

    if (claims.plano !== "express") {
      return NextResponse.json(
        { ok: false, error: "not_express" },
        { status: 403 },
      );
    }

    if (!claims.clienteId) {
      return NextResponse.json(
        { ok: false, error: "tenant_not_resolved" },
        { status: 403 },
      );
    }

    // ✅ resolve o usuario canônico (NÃO use mais user.id aqui)
    const { data: usuarioId, error: usuarioIdErr } =
      await supabase.rpc("current_usuario_id");

    if (usuarioIdErr || !usuarioId) {
      return NextResponse.json(
        {
          ok: false,
          error: "usuario_not_resolved",
          detail: usuarioIdErr?.message ?? null,
        },
        { status: 403 },
      );
    }

    const adminDb = getSupabaseAdmin();

    // 1) Busca o link ativo mais recente do cliente
    const { data: activeLinks, error: linksError } = await adminDb
      .from("copsoq_links")
      .select("id, contrato_id, cliente_id, ativo, created_at")
      .eq("cliente_id", claims.clienteId)
      .eq("ativo", true)
      .order("created_at", { ascending: false });

    if (linksError) {
      console.error("Erro ao buscar links ativos:", linksError);
      return NextResponse.json(
        { ok: false, error: "active_link_lookup_failed" },
        { status: 500 },
      );
    }

    if (!activeLinks || activeLinks.length === 0) {
      return NextResponse.json({
        ok: true,
        status: "no_active_link",
        canRespond: false,
        href: null,
        linkId: null,
        message:
          "No momento não há campanha ativa do questionário para este ambiente.",
      });
    }

    const currentLink = activeLinks[0];
    const currentLinkId = currentLink.id;
    const currentContratoId = currentLink.contrato_id;

    // 2) Busca a vaga do usuário nesse contrato/ciclo
    const { data: vagaAtual, error: vagaError } = await adminDb
      .from("questionario_vagas")
      .select("id, status")
      .eq("contrato_id", currentContratoId)
      .eq("usuario_id", usuarioId)
      .in("status", ["elegivel", "respondido"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (vagaError) {
      console.error("Erro ao buscar vaga do usuário:", vagaError);
      return NextResponse.json(
        { ok: false, error: "vaga_lookup_failed" },
        { status: 500 },
      );
    }

    // 3) Busca vínculo técnico do usuário com o link ativo
    // const { data: currentUserLink, error: userLinkError } = await adminDb
    //   .from("copsoq_aplicacoes_links")
    //   .select("id, usuario_id, link_id, aplicacao_id, created_at")
    //   .eq("usuario_id", usuarioId)
    //   .eq("link_id", currentLinkId)
    //   .maybeSingle();

    // if (userLinkError) {
    //   console.error(
    //     "Erro ao buscar vínculo do usuário ao link ativo:",
    //     userLinkError,
    //   );
    //   return NextResponse.json(
    //     { ok: false, error: "user_link_lookup_failed" },
    //     { status: 500 },
    //   );
    // }

    // // 4) Se já existe aplicação vinculada, considera answered
    // if (currentUserLink?.aplicacao_id) {
    //   return NextResponse.json({
    //     ok: true,
    //     status: "answered",
    //     canRespond: false,
    //     href: null,
    //     linkId: currentLinkId,
    //     message:
    //       "Seu registro indica que o questionário já foi respondido neste ciclo.",
    //   });
    // }

    // 5) Se a vaga do usuário já está marcada como respondido, também considera answered
    if (vagaAtual?.status === "respondido") {
      return NextResponse.json({
        ok: true,
        status: "answered",
        canRespond: false,
        href: null,
        linkId: currentLinkId,
        message:
          "Seu registro indica que o questionário já foi respondido neste ciclo.",
      });
    }

    // 6) Se existe vaga elegível, garante vínculo técnico e libera resposta
    if (vagaAtual?.status === "elegivel") {
      const { error: upsertLinkError } = await adminDb
        .from("copsoq_aplicacoes_links")
        .upsert(
          {
            link_id: currentLinkId,
            usuario_id: usuarioId,
            aplicacao_id: null,
          },
          { onConflict: "link_id,usuario_id" },
        );

      if (upsertLinkError) {
        console.error(
          "Erro ao sincronizar copsoq_aplicacoes_links:",
          upsertLinkError,
        );
        return NextResponse.json(
          { ok: false, error: "user_link_upsert_failed" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        ok: true,
        status: "pending",
        canRespond: true,
        href: buildCopsoqResponderHref(currentLinkId),
        linkId: currentLinkId,
        message: "Você está apto(a) a responder ao questionário neste ciclo.",
      });
    }

    // 7) Sem vaga para esse usuário no contrato/ciclo atual
    return NextResponse.json({
      ok: true,
      status: "not_linked",
      canRespond: false,
      href: null,
      linkId: currentLinkId,
      message:
        "Você ainda não foi incluído(a) na campanha ativa atual do questionário.",
    });
  } catch (error) {
    console.error("Erro inesperado em /api/copsoq/status:", error);

    return NextResponse.json(
      { ok: false, error: "unexpected_failure" },
      { status: 500 },
    );
  }
}
