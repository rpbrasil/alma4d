import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const supa = await createServerSupabase();

    // valida sessão
    const { data: auth, error: authErr } = await supa.auth.getUser();
    if (authErr || !auth?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // usuario_id canônico via RPC
    const { data: usuarioId, error: usuarioIdErr } =
      await supa.rpc("current_usuario_id");
    if (usuarioIdErr || !usuarioId) {
      return new NextResponse("Usuário sem associação", { status: 403 });
    }

    // resolve cliente_id a partir de usuario_organizacao
    const { data: org, error: orgErr } = await supa
      .from<{ cliente_id?: string }>("usuario_organizacao")
      .select("cliente_id")
      .eq("usuario_id", usuarioId)
      .maybeSingle();

    if (orgErr) {
      return new NextResponse(
        String(orgErr.message || "Erro ao buscar organização"),
        { status: 500 },
      );
    }

    const cliente_id = org?.cliente_id;
    if (!cliente_id) {
      return new NextResponse("Sem cliente associado", { status: 404 });
    }

    const url = new URL(req.url);
    const params = url.searchParams;
    const limit = Math.min(100, Number(params.get("limit") || "10"));
    const job_id = params.get("job_id");

    let query = supa
      .from("user_creation_rollbacks")
      .select(
        "id, auth_user_id, caller_id, cliente_id, job_id, reason, error_text, metadata, created_at",
      )
      .eq("cliente_id", cliente_id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (job_id) query = query.eq("job_id", job_id);

    const { data, error } = await query;
    if (error) {
      return new NextResponse(
        String(error.message || "Erro ao buscar rollbacks"),
        { status: 500 },
      );
    }

    return NextResponse.json({ rollbacks: data ?? [] });
  } catch (e) {
    return new NextResponse(
      String(e instanceof Error ? e.message : "Erro inesperado"),
      { status: 500 },
    );
  }
}
