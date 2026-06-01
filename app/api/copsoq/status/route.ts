import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { buildCopsoqHref } from "@/lib/navigation/copsoq";

type Role = "admin" | "cliente" | "gestor" | "usuario" | null;
type Plano = "express" | "premium" | null;

type JwtClaims = {
  role: Role;
  plano: Plano;
  clienteId: string | null;
  ativo: boolean | null;
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

    const role =
      payload.user_role === "admin" ||
      payload.user_role === "cliente" ||
      payload.user_role === "gestor" ||
      payload.user_role === "usuario"
        ? (payload.user_role as Role)
        : null;

    const plano =
      payload.user_plano === "express" || payload.user_plano === "premium"
        ? (payload.user_plano as Plano)
        : null;

    const clienteId =
      typeof payload.user_cliente_id === "string"
        ? payload.user_cliente_id
        : null;

    const ativo =
      typeof payload.user_ativo === "boolean" ? payload.user_ativo : null;

    return { role, plano, clienteId, ativo };
  } catch {
    return { role: null, plano: null, clienteId: null, ativo: null };
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {
            // sem escrita aqui
          },
        },
      },
    );

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return NextResponse.json(
        { ok: false, error: "not_authenticated" },
        { status: 401 },
      );
    }

    const claims = parseJwtClaims(session.access_token);

    if (claims.ativo === false) {
      return NextResponse.json(
        { ok: false, error: "user_inactive" },
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
      .eq("usuario_id", session.user.id)
      .in("status", ["elegivel", "respondido"])
      .maybeSingle();

    if (vagaError) {
      console.error("Erro ao buscar vaga do usuário:", vagaError);
      return NextResponse.json(
        { ok: false, error: "vaga_lookup_failed" },
        { status: 500 },
      );
    }

    // 3) Busca vínculo técnico do usuário com o link ativo
    const { data: currentUserLink, error: userLinkError } = await adminDb
      .from("copsoq_aplicacoes_links")
      .select("id, usuario_id, link_id, aplicacao_id, created_at")
      .eq("usuario_id", session.user.id)
      .eq("link_id", currentLinkId)
      .maybeSingle();

    if (userLinkError) {
      console.error(
        "Erro ao buscar vínculo do usuário ao link ativo:",
        userLinkError,
      );
      return NextResponse.json(
        { ok: false, error: "user_link_lookup_failed" },
        { status: 500 },
      );
    }

    // 4) Se já existe aplicação vinculada, considera answered
    if (currentUserLink?.aplicacao_id) {
      return NextResponse.json({
        ok: true,
        status: "answered",
        canRespond: false,
        href: buildCopsoqHref(currentLinkId),
        linkId: currentLinkId,
        message:
          "Seu registro indica que o questionário já foi respondido neste ciclo.",
      });
    }

    // 5) Se a vaga do usuário já está marcada como respondido, também considera answered
    if (vagaAtual?.status === "respondido") {
      return NextResponse.json({
        ok: true,
        status: "answered",
        canRespond: false,
        href: buildCopsoqHref(currentLinkId),
        linkId: currentLinkId,
        message:
          "Seu registro indica que o questionário já foi respondido neste ciclo.",
      });
    }

    // 6) Se existe vaga elegível, garante vínculo técnico e libera resposta
    if (vagaAtual?.status === "elegivel") {
      if (!currentUserLink) {
        const { error: upsertLinkError } = await adminDb
          .from("copsoq_aplicacoes_links")
          .upsert(
            {
              link_id: currentLinkId,
              usuario_id: session.user.id,
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
      }

      return NextResponse.json({
        ok: true,
        status: "pending",
        canRespond: true,
        href: buildCopsoqHref(currentLinkId),
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
