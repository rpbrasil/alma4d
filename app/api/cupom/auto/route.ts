import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function onlyDigits(v: string) {
  return (v || "").replace(/\D/g, "");
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { cnpj?: string; plano?: string };
    const cnpj = onlyDigits(body.cnpj ?? "");
    const plano = String(body.plano ?? "express");

    if (cnpj.length !== 14) {
      return NextResponse.json(
        { ok: false, error: "CNPJ inválido" },
        { status: 400 },
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    // 1) Descobre se o CNPJ é elegível (quais parceiros)
    // busca empresas elegíveis - tabela renomeada para parceiros_empresas_elegiveis
    const { data: elegiveis, error: eErr } = await supabaseAdmin
      .from("parceiros_empresas_elegiveis")
      .select("parceiro_id")
      .eq("cnpj", cnpj)
      .eq("ativo", true);

    // compatibilidade: se não existir dados, tenta tabela antiga
    let parceiroIds: string[] = [];

    if (eErr) {
      // tenta tabela antiga como fallback
      const { data: oldData, error: oldErr } = await supabaseAdmin
        .from("empresas_elegiveis")
        .select("parceiro_id")
        .eq("cnpj", cnpj)
        .eq("ativo", true);

      if (oldErr) {
        return NextResponse.json(
          { ok: false, error: eErr.message },
          { status: 500 },
        );
      }

      const oldRows = (oldData ?? []) as Array<{ parceiro_id: string | null }>;
      parceiroIds = oldRows
        .map((x) => x.parceiro_id)
        .filter((x): x is string => typeof x === "string" && x.length > 0);
    } else {
      const rows = (elegiveis ?? []) as Array<{ parceiro_id: string | null }>;
      parceiroIds = rows
        .map((x) => x.parceiro_id)
        .filter((x): x is string => typeof x === "string" && x.length > 0);
    }

    if (!parceiroIds.length) {
      // não revela detalhes; só diz que não há cupom disponível
      return NextResponse.json({ ok: true, hasCoupon: false });
    }

    // 2) Busca cupons ativos desses parceiros
    const { data: cupons, error: cErr } = await supabaseAdmin
      .from("cupons")
      .select("codigo, tipo, valor, plano, valido_de, valido_ate, ativo")
      .in("parceiro_id", parceiroIds)
      .eq("ativo", true);

    if (cErr) {
      return NextResponse.json(
        { ok: false, error: cErr.message },
        { status: 500 },
      );
    }

    type CupomRow = {
      codigo: string;
      tipo: "percentual" | "fixo" | "desconto" | "comissao";
      valor: number;
      plano: string | null;
      valido_de: string | null;
      valido_ate: string | null;
      ativo: boolean;
    };

    const validos = (cupons ?? []).filter((c: CupomRow) => {
      if (c.plano && c.plano !== plano) return false;

      const now = new Date();

      if (c.valido_de && new Date(c.valido_de) > now) return false;
      if (c.valido_ate && new Date(c.valido_ate) < now) return false;
      return true;
    });

    if (!validos.length) {
      return NextResponse.json({ ok: true, hasCoupon: false });
    }

    // 4) Estratégia simples: retorna o primeiro válido
    // (se quiser “melhor cupom”, depois podemos ordenar)
    const sugestao = validos[0];

    return NextResponse.json({
      ok: true,
      hasCoupon: true,
      cupom_codigo: sugestao.codigo,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
