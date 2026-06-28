import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getCaller } from "../_shared/getCaller";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("job_id");

  if (!jobId) {
    return NextResponse.json({ error: "job_id obrigatório" }, { status: 400 });
  }

  // ✅ segurança env
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
      {
        error: code,
        message: code,
      },
      { status: map[code] ?? 400 },
    );
  }

  const { data: job, error: jobError } = await supabaseAdmin
    .from("importacao_usuarios_jobs")
    .select(
      `
      id,
      status,
      total,
      processed,
      success,
      errors,
      last_error,
      created_at,
      updated_at,
      caller_cliente_id
    `,
    )
    .eq("id", jobId)
    .maybeSingle();

  if (jobError) {
    return NextResponse.json({ error: "Erro ao buscar job" }, { status: 500 });
  }

  if (!job) {
    return NextResponse.json({ error: "Job não encontrado" }, { status: 404 });
  }

  // ✅ proteção multi-tenant
  if (
    caller.role !== "admin" &&
    String(job.caller_cliente_id) !== String(caller.cliente_id)
  ) {
    return NextResponse.json({ error: "Job de outro tenant" }, { status: 403 });
  }

  return NextResponse.json({ job });
}
