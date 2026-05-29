import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCaller } from "../_shared/getCaller";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("job_id");

  if (!jobId) {
    return NextResponse.json({ error: "job_id obrigatório" }, { status: 400 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  let caller;

  try {
    caller = await getCaller(req, supabaseAdmin);
  } catch (e) {
    const code = e instanceof Error ? e.message : "UNKNOWN";
    return NextResponse.json({ error: code }, { status: 403 });
  }

  const { data: job } = await supabaseAdmin
    .from("importacao_usuarios_jobs")
    .select("id, caller_cliente_id")
    .eq("id", jobId)
    .maybeSingle();

  if (!job) {
    return NextResponse.json({ error: "Job não encontrado" }, { status: 404 });
  }

  if (
    caller.role !== "admin" &&
    String(job.caller_cliente_id) !== String(caller.cliente_id)
  ) {
    return NextResponse.json({ error: "Job de outro tenant" }, { status: 403 });
  }

  const { data: rows } = await supabaseAdmin
    .from("importacao_usuarios_linhas")
    .select("linha, error, payload")
    .eq("job_id", jobId)
    .eq("status", "error")
    .order("linha", { ascending: true })
    .limit(50);

  return NextResponse.json({
    errors: rows ?? [],
  });
}
