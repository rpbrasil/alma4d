import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

type Body = {
  contratoId: string;
  campaign?: string;
  forceNewCycle?: boolean;
};
type CopsoqLink = {
  id: string;
  contrato_id: string;
  cliente_id: string;
  max_respostas: number;
  usadas: number;
  ativo: boolean;
  created_at: string;
};

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

function normalizeBaseUrl(raw: string) {
  return raw.replace(/\/+$/, "");
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const headerStore = await headers();

    // 1) Client autenticado por cookies (sessão do usuário)
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {
            // sem necessidade de escrever cookies aqui
          },
        },
      },
    );

    const {
      data: { session },
      error: sessionErr,
    } = await supabaseAuth.auth.getSession();

    if (sessionErr || !session?.user) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    const user = session.user;
    const claims = parseJwtClaims(session.access_token);

    // 2) Validações básicas de claims
    if (claims.ativo === false) {
      return NextResponse.json({ error: "inactive_user" }, { status: 403 });
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

    // Recomendação: usuário final não gera link
    if (claims.role === "usuario") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // 3) Confirma ativo no cadastro de usuários
    const { data: profile, error: profErr } = await supabaseAuth
      .from("usuarios")
      .select("ativo")
      .eq("id", user.id)
      .single();

    if (profErr) {
      return NextResponse.json({ error: profErr.message }, { status: 500 });
    }

    if (profile?.ativo === false) {
      return NextResponse.json({ error: "inactive_user" }, { status: 403 });
    }

    // 4) Body
    let body: Body;
    try {
      body = (await req.json()) as Body;
    } catch {
      return NextResponse.json({ error: "json_invalido" }, { status: 400 });
    }
    const forceNewCycle = body.forceNewCycle === true;
    const contratoId = String(body.contratoId ?? "").trim();
    if (!contratoId) {
      return NextResponse.json(
        { error: "contratoId_obrigatorio" },
        { status: 400 },
      );
    }

    // 5) Admin client (service role)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // 6) Validar contrato
    const { data: contrato, error: contratoErr } = await supabaseAdmin
      .from("contratos")
      .select("id, cliente_id, status, limite_usuarios")
      .eq("id", contratoId)
      .single();

    if (contratoErr || !contrato) {
      return NextResponse.json(
        { error: "contrato_nao_encontrado" },
        { status: 404 },
      );
    }

    // 🔒 contrato precisa pertencer ao tenant do usuário
    if (contrato.cliente_id !== claims.clienteId) {
      return NextResponse.json(
        { error: "contrato_fora_do_tenant" },
        { status: 403 },
      );
    }

    if (String(contrato.status).toLowerCase() !== "ativo") {
      return NextResponse.json({ error: "contrato_inativo" }, { status: 403 });
    }

    const limiteUsuarios =
      typeof contrato.limite_usuarios === "number"
        ? contrato.limite_usuarios
        : null;

    if (!limiteUsuarios || limiteUsuarios <= 0) {
      return NextResponse.json(
        { error: "contrato_sem_limite_usuarios" },
        { status: 403 },
      );
    }

    // 7) Validar cliente
    const { data: cliente, error: clienteErr } = await supabaseAdmin
      .from("clientes")
      .select("id, ativo")
      .eq("id", contrato.cliente_id)
      .single();

    if (clienteErr || !cliente) {
      return NextResponse.json(
        { error: "cliente_nao_encontrado" },
        { status: 404 },
      );
    }

    if (cliente.ativo === false) {
      return NextResponse.json({ error: "cliente_inativo" }, { status: 403 });
    }

    // 8) Buscar link ativo existente (idempotente)
    const { data: existing, error: exErr } = await supabaseAdmin
      .from("copsoq_links")
      .select(
        "id, contrato_id, cliente_id, max_respostas, usadas, ativo, created_at",
      )
      .eq("contrato_id", contratoId)
      .eq("cliente_id", claims.clienteId)
      .eq("ativo", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (exErr) {
      return NextResponse.json({ error: exErr.message }, { status: 500 });
    }

    let link = existing;
    const campaign = (body.campaign ?? "").trim();
    // ✅ ROTACIONAR CICLO
    if (forceNewCycle) {
      const rotateResult = await supabaseAdmin.rpc("rotate_copsoq_cycle", {
        p_contrato_id: contratoId,
        p_cliente_id: claims.clienteId,
        p_created_by: user.id,
        p_max_respostas: limiteUsuarios,
        p_campanha: campaign || null,
      });

      const rotated = rotateResult.data as CopsoqLink | CopsoqLink[] | null;

      if (!rotated) {
        return NextResponse.json(
          { error: "rotate_cycle_failed" },
          { status: 500 },
        );
      }

      link = Array.isArray(rotated) ? rotated[0] : rotated;
    }

    // ✅ CRIA NORMAL se não existir
    else if (!link) {
      const { data: created, error: crErr } = await supabaseAdmin
        .from("copsoq_links")
        .insert({
          contrato_id: contratoId,
          cliente_id: claims.clienteId,
          max_respostas: limiteUsuarios,
          usadas: 0,
          ativo: true,
          created_by: user.id,
          campanha: campaign || null,
        })
        .select("*")
        .single();

      if (crErr) {
        const { data: reFetched, error: rfErr } = await supabaseAdmin
          .from("copsoq_links")
          .select("*")
          .eq("contrato_id", contratoId)
          .eq("cliente_id", claims.clienteId)
          .eq("ativo", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (rfErr || !reFetched) {
          return NextResponse.json({ error: crErr.message }, { status: 500 });
        }

        link = reFetched;
      } else {
        link = created;
      }
    }

    // 10) Montar URL final correta
    const envBase = process.env.NEXT_PUBLIC_APP_URL;
    const proto = headerStore.get("x-forwarded-proto") ?? "http";
    const host =
      headerStore.get("x-forwarded-host") ??
      headerStore.get("host") ??
      new URL(req.url).host;

    const baseUrl = normalizeBaseUrl(envBase ? envBase : `${proto}://${host}`);
    if (!link) {
      return NextResponse.json({ error: "link_not_created" }, { status: 500 });
    }
    const url = new URL("/dashboard/express/copsoq", baseUrl);
    url.searchParams.set("linkId", link.id);

    if (campaign) {
      url.searchParams.set("c", campaign);
    }

    return NextResponse.json({
      ok: true,
      linkId: link.id,
      contratoId: link.contrato_id,
      maxRespostas: Number(link.max_respostas ?? 0),
      usadas: Number(link.usadas ?? 0),
      url: url.toString(),
    });
  } catch (error) {
    console.error("Erro inesperado em /api/copsoq/create-link:", error);
    return NextResponse.json({ error: "unexpected_failure" }, { status: 500 });
  }
}
