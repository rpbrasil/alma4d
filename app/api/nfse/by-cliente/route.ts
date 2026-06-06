import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const clienteId = searchParams.get("cliente_id");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data } = await supabase
    .from("nfse_emissoes")
    .select("id, ref, status, resposta, created_at")
    .eq("cliente_id", clienteId)
    .order("created_at", { ascending: false });

  return Response.json(data ?? []);
}
