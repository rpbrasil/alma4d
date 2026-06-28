import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo");

  const supabase = getSupabaseAdmin();

  let table: string | null = null;

  if (tipo === "nfse_atrasada") {
    table = "v_alerta_nfse_atrasada";
  } else if (tipo === "pagamento_sem_email") {
    table = "v_alerta_pagamento_sem_email";
  } else if (tipo === "boleto_nao_enviado") {
    table = "v_alerta_boleto_nao_enviado";
  } else if (tipo === "pix_nao_enviado") {
    table = "v_alerta_pix_nao_enviado";
  }

  if (!table) {
    return NextResponse.json({ data: [] });
  }

  const { data, error } = await supabase.from(table).select("*").limit(50);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}
