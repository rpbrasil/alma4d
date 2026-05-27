import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { buildCopsoqHref } from "@/lib/navigation/copsoq";

type Role = "admin" | "cliente" | "gestor" | "usuario" | null;
type Plano = "express" | "premium" | null;

function parseJwtClaims(accessToken: string | null | undefined): {
  role: Role;
  plano: Plano;
  clienteId: string | null;
  ativo: boolean | null;
} {
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
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    const claims = parseJwtClaims(session.access_token);

    if (claims.ativo === false) {
      return NextResponse.json({ error: "user_inactive" }, { status: 403 });
    }

    if (claims.plano !== "express") {
      return NextResponse.json({ error: "not_express" }, { status: 403 });
    }

    if (!claims.clienteId) {
      return NextResponse.json(
        { error: "tenant_not_resolved" },
        { status: 403 },
      );
    }

    const adminDb = getSupabaseAdmin();

    /**
     * ASSUNÇÃO PRÁTICA:
     * considera o link ativo mais recente do cliente.
     *
     * Se no seu negócio houver mais de um contrato ativo simultâneo por cliente
     * para campanhas COPSOQ diferentes, esta regra pode ser refinada depois
     * (por contrato explicitado, por período, por campanha etc.).
     */
    const { data: activeLinks, error: linksError } = await adminDb
      .from("copsoq_links")
      .select("id, contrato_id, ativo, created_at")
      .eq("ativo", true)
      .order("created_at", { ascending: false });

    if (linksError) {
      console.error("Erro ao buscar links ativos:", linksError);
      return NextResponse.json(
        { error: "active_link_lookup_failed" },
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

    /**
     * Como copsoq_links não traz cliente_id diretamente,
     * filtramos contratos do cliente e cruzamos.
     */
    const contratoIds = activeLinks.map((l) => l.contrato_id);

    const { data: contratos, error: contratosError } = await adminDb
      .from("contratos")
      .select("id, cliente_id, status")
      .in("id", contratoIds)
      .eq("cliente_id", claims.clienteId)
      .eq("status", "ativo");

    if (contratosError) {
      console.error("Erro ao buscar contratos ativos:", contratosError);
      return NextResponse.json(
        { error: "contract_lookup_failed" },
        { status: 500 },
      );
    }

    const validContratoIds = new Set((contratos ?? []).map((c) => c.id));

    const candidateLinks = activeLinks.filter((l) =>
      validContratoIds.has(l.contrato_id),
    );

    if (candidateLinks.length === 0) {
      return NextResponse.json({
        ok: true,
        status: "no_active_link",
        canRespond: false,
        href: null,
        linkId: null,
        message:
          "No momento não há campanha ativa do questionário vinculada ao seu contrato.",
      });
    }

    const currentLink = candidateLinks[0];
    const currentLinkId = currentLink.id as string;

    const { data: userLink, error: userLinkError } = await adminDb
      .from("copsoq_aplicacoes_links")
      .select("id, usuario_id, link_id, aplicacao_id")
      .eq("usuario_id", session.user.id)
      .eq("link_id", currentLinkId)
      .maybeSingle();

    if (userLinkError) {
      console.error(
        "Erro ao buscar vínculo do usuário com o link:",
        userLinkError,
      );
      return NextResponse.json(
        { error: "user_link_lookup_failed" },
        { status: 500 },
      );
    }

    // 1) Usuário não foi vinculado à campanha atual
    if (!userLink) {
      return NextResponse.json({
        ok: true,
        status: "not_linked",
        canRespond: false,
        href: null,
        linkId: currentLinkId,
        message:
          "Você ainda não foi incluído(a) na campanha atual do questionário.",
      });
    }

    // 2) Já respondeu no ciclo atual
    if (userLink.aplicacao_id) {
      return NextResponse.json({
        ok: true,
        status: "answered",
        canRespond: true,
        href: buildCopsoqHref(currentLinkId),
        linkId: currentLinkId,
        message:
          "Seu registro indica que o questionário já foi respondido neste ciclo.",
      });
    }

    // 3) Está apto e ainda não respondeu
    return NextResponse.json({
      ok: true,
      status: "pending",
      canRespond: true,
      href: buildCopsoqHref(currentLinkId),
      linkId: currentLinkId,
      message: "Você está apto(a) a responder ao questionário neste ciclo.",
    });
  } catch (error) {
    console.error("Erro inesperado em /api/copsoq/status:", error);
    return NextResponse.json({ error: "unexpected_failure" }, { status: 500 });
  }
}
