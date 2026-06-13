import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/contratos-flow";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { contratoId, cupom } = body;

    if (!contratoId || !cupom) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const supabase = supabaseAdmin();

    const { error } = await supabase
      .from("contratos")
      .update({
        cupom_codigo: cupom.codigo,
        cupom_percentual: cupom.percentual,
        desconto_cents: cupom.descontoCents,
        total_com_desconto_cents: cupom.totalComDescontoCents,
      })
      .eq("id", contratoId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno";

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
