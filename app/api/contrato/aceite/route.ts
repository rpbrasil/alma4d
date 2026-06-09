export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getCaller } from "../../importacao-usuarios/_shared/getCaller";
import { generateContratoHTML } from "@/lib/contratoTemplate";

function getClientIp(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();

  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();

  const xri = req.headers.get("x-real-ip");
  if (xri) return xri.trim();

  return "0.0.0.0";
}

function log(requestId: string, ...args: unknown[]) {
  console.log(`[api/contrato/aceite][${requestId}]`, ...args);
}

type Body = {
  contratoId?: string;
  versao_termos?: string;
};

export async function POST(req: Request) {
  const requestId = `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  try {
    log(requestId, "START");

    const body: Body = await req.json().catch(() => ({}));
    log(requestId, "BODY", body);

    const contratoId = String(body.contratoId ?? "").trim();
    const versaoTermos = String(body.versao_termos ?? "v1.0").trim();

    if (!contratoId) {
      return NextResponse.json(
        { error: "contratoId é obrigatório" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    // ✅ AUTH
    let caller;
    try {
      caller = await getCaller(req, supabase);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === "NO_TOKEN" || msg === "INVALID_TOKEN") {
        return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
      }
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 403 },
      );
    }

    const authUserId = caller.id;
    log(requestId, "auth_user_id:", authUserId);

    // ✅ identity (fonte da verdade)
    const { data: identity } = await supabase
      .from("usuario_auth_identities")
      .select("usuario_id")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    let userId = identity?.usuario_id ?? null;

    if (!userId) {
      log(requestId, "identity não encontrada - retry");

      const DELAY_IDENTITY_RETRY_MS = 120;
      await new Promise((r) => setTimeout(r, DELAY_IDENTITY_RETRY_MS));

      const { data: retry, error: retryErr } = await supabase
        .from("usuario_auth_identities")
        .select("usuario_id")
        .eq("auth_user_id", authUserId)
        .maybeSingle();

      if (retryErr) {
        log(requestId, "retry error:", retryErr.message);
      }

      userId = retry?.usuario_id ?? null;

      if (!userId) {
        return NextResponse.json(
          { error: "Usuário não encontrado" },
          { status: 403 },
        );
      }
    }

    // ✅ PERFIL
    const { data: perfil, error: perfilErr } = await supabase
      .from("usuarios")
      .select("id, role, cliente_id")
      .eq("id", userId)
      .single();

    if (perfilErr || !perfil) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 401 },
      );
    }

    // ✅ SCHEMA CHECK
    const { error: schemaCheckError } = await supabase
      .from("contratos")
      .select("termos_html")
      .limit(1);

    if (schemaCheckError) {
      log(requestId, "SCHEMA CACHE ERROR", schemaCheckError.message);

      return NextResponse.json(
        {
          error:
            "API não reconhece termos_html. Rode: NOTIFY pgrst, 'reload schema';",
          detail: schemaCheckError.message,
        },
        { status: 503 },
      );
    }

    // ✅ CONTRATO
    const { data: contrato, error: contratoError } = await supabase
      .from("contratos")
      .select("id, cliente_id, aceite_termos, termos_html")
      .eq("id", contratoId)
      .single();

    if (contratoError || !contrato) {
      return NextResponse.json(
        { error: "Contrato não encontrado" },
        { status: 404 },
      );
    }

    const isAdmin = perfil.role === "admin";
    const sameTenant =
      perfil.cliente_id && contrato.cliente_id === perfil.cliente_id;

    if (!isAdmin && !sameTenant) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    if (contrato.aceite_termos && contrato.termos_html) {
      return NextResponse.json({
        ok: true,
        message: "Contrato já aceito anteriormente",
        contratoId,
      });
    }

    const ip = getClientIp(req);
    const userAgent = req.headers.get("user-agent") || "unknown";
    const now = new Date().toISOString();

    // ✅ SNAPSHOT
    const { data: cliente } = await supabase
      .from("clientes")
      .select("*")
      .eq("id", contrato.cliente_id)
      .single();

    const { data: usuario } = await supabase
      .from("usuarios")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    const termosHtmlSnapshot = generateContratoHTML({
      empresa: {
        razaoSocial: cliente?.razao_social ?? "",
        cnpj: cliente?.cnpj ?? "",
      },
      usuario: {
        nome: usuario?.nome_completo ?? "",
        email: usuario?.email ?? "",
        documento: usuario?.documento ?? "",
      },
      contrato: {
        numero: contrato.id,
        versao: 1,
        dataAceite: new Date().toLocaleString("pt-BR"),
        ip,
        userAgent,
      },
      termosHtml: contrato.termos_html ?? "",
      privacidadeHtml: "",
      hash: `snapshot-${contrato.id}-${Date.now()}`,
    });

    const { error } = await supabase.rpc("registrar_aceite_contrato", {
      p_id: contratoId,
      p_ip: ip,
      p_user_agent: userAgent,
      p_versao: versaoTermos,
      p_html: termosHtmlSnapshot,
    });

    if (error) {
      throw new Error(error.message);
    }

    // ✅ LOG
    const { error: logError } = await supabase.from("logs").insert({
      source: "api",
      level: "info",
      event_type: "contrato_aceito",
      entity: "contratos",
      user_id: userId,
      message: { contrato_id: contratoId },
      metadata: { ip, user_agent: userAgent, versao_termos: versaoTermos },
    });

    if (logError) {
      log(requestId, "LOG ERROR", logError.message);
    }

    // ✅ USUÁRIO
    await supabase
      .from("usuarios")
      .update({
        aceitou_termos: true,
        data_aceite_termos: now,
      })
      .eq("id", userId);

    log(requestId, "SUCCESS");

    return NextResponse.json({
      ok: true,
      contratoId,
      aceite_termos: true,
    });
  } catch (error: unknown) {
    console.error(
      "[api/contrato/aceite] ERROR",
      error instanceof Error ? error.message : String(error),
    );

    return NextResponse.json(
      {
        error: "Erro interno",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}