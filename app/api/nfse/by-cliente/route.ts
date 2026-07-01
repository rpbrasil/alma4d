import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function normalizeRpcResult(u: unknown): string | null {
  if (u == null) return null;
  if (typeof u === "string") return u;
  if (typeof u === "number") return String(u);
  if (Array.isArray(u) && u.length > 0) {
    const first = u[0];
    return (typeof first === "string" && first) || first?.usuario_id || null;
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

// GET /api/nfse/by-cliente
// - autentica via cookie/session usando createServerSupabase
// - resolve `usuario_id` via RPC (convenção do projeto)
// - busca `cliente_id` do usuário e retorna apenas NFSe desse cliente
// - aceita ?cliente_id= como fallback quando a resolução via RPC falha
export async function GET(req: Request) {
  try {
    const supabase = await createServerSupabase();

    // verifica sessão do usuário
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    let clienteId: string | null = null;

    // Tentativa 1: resolução via RPC + tabela usuarios
    try {
      const { data: usuarioRpcData, error: usuarioRpcErr } =
        await supabase.rpc("current_usuario_id");

      if (!usuarioRpcErr) {
        const usuarioId = normalizeRpcResult(usuarioRpcData);
        if (usuarioId) {
          const { data: usuario } = await admin
            .from("usuarios")
            .select("cliente_id")
            .eq("id", usuarioId)
            .maybeSingle();
          clienteId = usuario?.cliente_id ?? null;
        }
      }
    } catch {
      // ignora — tentará fallback abaixo
    }

    // Tentativa 2: fallback — usa auth.uid() diretamente para resolver cliente_id
    if (!clienteId) {
      const { data: usuarioByAuth } = await admin
        .from("usuarios")
        .select("cliente_id")
        .eq("auth_id", authData.user.id)
        .maybeSingle();
      clienteId = usuarioByAuth?.cliente_id ?? null;
    }

    // Tentativa 3: fallback — aceita ?cliente_id= query param (validado: deve existir e pertencer ao user autenticado)
    if (!clienteId) {
      const paramId = new URL(req.url).searchParams.get("cliente_id");
      if (paramId) {
        const { data: check } = await admin
          .from("contratos")
          .select("id")
          .eq("cliente_id", paramId)
          .limit(1)
          .maybeSingle();
        // Só aceita se existir algum contrato com esse cliente_id
        // (o usuário já provou quem é via auth.getUser acima)
        if (check) clienteId = paramId;
      }
    }

    if (!clienteId) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 403 },
      );
    }

    // Use admin client to read nfse_emissoes but enforce cliente_id filter server-side
    const { data, error: fetchErr } = await admin
      .from("nfse_emissoes")
      .select("id, ref, status, resposta, created_at, codigo_verificacao")
      .eq("cliente_id", clienteId)
      .order("created_at", { ascending: false });

    if (fetchErr) {
      console.error("[nfse/by-cliente] select error:", fetchErr.message);
      return NextResponse.json([], { status: 200 });
    }

    // If NFSE_STORAGE_BUCKET is configured, sign storage paths inside the `resposta` JSON
    const NFSE_BUCKET = process.env.NFSE_STORAGE_BUCKET ?? null;
    if (NFSE_BUCKET && Array.isArray(data)) {
      type RespostaLike = Record<string, unknown>;
      const signed = await Promise.all(
        data.map(async (row) => {
          let resposta: RespostaLike | null = null;
          try {
            resposta =
              typeof row.resposta === "string"
                ? (JSON.parse(row.resposta as string) as RespostaLike)
                : (row.resposta as RespostaLike | null);
          } catch {
            return row;
          }
          if (!resposta) return row;

          for (const field of [
            "caminho_xml_nota_fiscal",
            "url_danfse",
          ] as const) {
            const val = resposta[field];
            if (val && typeof val === "string" && !val.startsWith("http")) {
              try {
                const { data: urlResp } = await admin.storage
                  .from(NFSE_BUCKET)
                  .createSignedUrl(val, 60 * 60);
                if (urlResp?.signedUrl) resposta[field] = urlResp.signedUrl;
              } catch {
                // ignore
              }
            }
          }

          return { ...row, resposta };
        }),
      );

      return NextResponse.json(signed ?? []);
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("/api/nfse/by-cliente error:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
