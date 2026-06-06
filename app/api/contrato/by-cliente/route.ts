import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const clienteId = searchParams.get("cliente_id");

  if (!clienteId) {
    return Response.json([], { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await supabase
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
    return Response.json([], { status: 500 });
  }

  return Response.json(data ?? []);
}
