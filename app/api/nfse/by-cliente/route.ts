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
export async function GET() {
  try {
    const supabase = await createServerSupabase();

    // verifica sessão do usuário
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // obtém o usuario interno (RPC do projeto)
    const { data: usuarioRpcData, error: usuarioRpcErr } =
      await supabase.rpc("current_usuario_id");
    if (usuarioRpcErr) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const usuarioId = normalizeRpcResult(usuarioRpcData);
    if (!usuarioId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // pega cliente_id do usuário
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("cliente_id")
      .eq("id", usuarioId)
      .maybeSingle();

    const clienteId = usuario?.cliente_id ?? null;
    if (!clienteId) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 403 },
      );
    }

    // Use admin client to read nfse_emissoes but enforce cliente_id filter server-side
    const admin = getSupabaseAdmin();
    const { data } = await admin
      .from("nfse_emissoes")
      .select(
        "id, ref, status, resposta, created_at, codigo_verificacao, url_danfse, caminho_xml_nota_fiscal",
      )
      .eq("cliente_id", clienteId)
      .order("created_at", { ascending: false });

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("/api/nfse/by-cliente error:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
