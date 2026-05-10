import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("job_id");
  if (!jobId)
    return NextResponse.json({ error: "job_id obrigatório" }, { status: 400 });

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Token ausente" }, { status: 401 });
  }
  const token = authHeader.split(" ")[1];

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: userWrap, error: authError } =
    await supabaseAdmin.auth.getUser(token);
  if (authError || !userWrap?.user) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  const callerId = userWrap.user.id;

  const { data: caller } = await supabaseAdmin
    .from("usuarios")
    .select("id, role, cliente_id, ativo")
    .eq("id", callerId)
    .maybeSingle();

  if (!caller || !caller.ativo) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { data: job } = await supabaseAdmin
    .from("importacao_usuarios_jobs")
    .select("id, caller_cliente_id")
    .eq("id", jobId)
    .maybeSingle();

  if (!job)
    return NextResponse.json({ error: "Job não encontrado" }, { status: 404 });

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

  return NextResponse.json({ errors: rows ?? [] });
}
