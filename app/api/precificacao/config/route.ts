import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type PrecificacaoConfig = {
  k_base: number;
  decaimento: number;
  multiplicador_baixo: number;
  multiplicador_medio: number;
  multiplicador_alto: number;
  minimo_usuarios: number;
  fator_sudeste: number;
  fator_sul: number;
  fator_centro_oeste: number;
  fator_nordeste: number;
  fator_norte: number;
};

function num(v: unknown) {
  // Postgres numeric pode vir string
  return typeof v === "number" ? v : Number(v);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const plano = url.searchParams.get("plano") || "express";

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    const { data, error } = await supabaseAdmin
      .from("precificacao_config")
      .select(
        `
        k_base,
        decaimento,
        multiplicador_baixo,
        multiplicador_medio,
        multiplicador_alto,
        minimo_usuarios,
        fator_sudeste,
        fator_sul,
        fator_centro_oeste,
        fator_nordeste,
        fator_norte
      `,
      )
      .eq("plano", plano)
      .eq("ativo", true)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ ok: true, config: null }, { status: 200 });
    }

    const row = data[0] as Record<string, unknown>;

    const config: PrecificacaoConfig = {
      k_base: num(row.k_base),
      decaimento: num(row.decaimento),
      multiplicador_baixo: num(row.multiplicador_baixo),
      multiplicador_medio: num(row.multiplicador_medio),
      multiplicador_alto: num(row.multiplicador_alto),
      minimo_usuarios: Number(row.minimo_usuarios),
      fator_sudeste: num(row.fator_sudeste),
      fator_sul: num(row.fator_sul),
      fator_centro_oeste: num(row.fator_centro_oeste),
      fator_nordeste: num(row.fator_nordeste),
      fator_norte: num(row.fator_norte),
    };

    return NextResponse.json({ ok: true, config }, { status: 200 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
