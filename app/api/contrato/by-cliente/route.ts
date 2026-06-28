import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getCaller } from "@/api/importacao-usuarios/_shared/getCaller";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const clienteId = searchParams.get("cliente_id");

    if (!clienteId) {
      return NextResponse.json(
        { error: "cliente_id obrigatório" },
        { status: 400 },
      );
    }

    // ✅ client para autenticação (usa cookie do usuário)
    const supabaseAuth = await createServerSupabase();

    // ✅ client admin (sem sessão, apenas DB)
    const supabaseAdmin = getSupabaseAdmin();

    let caller;

    try {
      // ✅ agora usando client correto
      caller = await getCaller(req, supabaseAuth);
    } catch (e) {
      const code = e instanceof Error ? e.message : "UNKNOWN";

      const statusMap: Record<string, number> = {
        NO_TOKEN: 401,
        INVALID_TOKEN: 401,
        NO_PERMISSION: 403,
        INVALID_PLAN: 403,
        CLIENT_INACTIVE: 403,
      };

      return NextResponse.json(
        { error: code },
        { status: statusMap[code] ?? 401 },
      );
    }

    // ✅ segurança multi-tenant
    if (caller.role !== "admin" && caller.cliente_id !== clienteId) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    // ✅ query usando admin client
    const { data, error } = await supabaseAdmin
      .from("contratos")
      .select(
        `
        id,
        numero_contrato,
        versao,
        status,
        criado_em,
        atualizado_em,
        pdf_url,
        pdf_assinado_url,
        tipo_contrato
      `,
      )
      .eq("cliente_id", clienteId)
      .order("criado_em", { ascending: false });

    if (error) {
      console.error("Erro ao buscar contratos:", error);
      return NextResponse.json(
        { error: "Erro ao buscar contratos" },
        { status: 500 },
      );
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("/api/contrato/by-cliente error:", err);

    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
