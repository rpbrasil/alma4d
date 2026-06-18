import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type TipoCupom = "desconto" | "comissao";

function num(v: unknown) {
  return typeof v === "number" ? v : Number(v);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      codigo?: string;
      totalMensalCents?: number;
      plano?: string;
      cnpj?: string;
    };
    const cnpj = String(body.cnpj ?? "").replace(/\D/g, "");

    if (cnpj.length !== 14) {
      return NextResponse.json(
        { ok: false, error: "CNPJ inválido para uso de cupom." },
        { status: 400 },
      );
    }
    const codigo = String(body.codigo ?? "")
      .trim()
      .toUpperCase();
    const totalMensalCents = Number(body.totalMensalCents ?? 0);
    const plano = String(body.plano ?? "express");

    if (!codigo) {
      return NextResponse.json(
        { ok: false, error: "Informe um cupom." },
        { status: 400 },
      );
    }
    if (!Number.isFinite(totalMensalCents) || totalMensalCents <= 0) {
      return NextResponse.json(
        { ok: false, error: "Total inválido." },
        { status: 400 },
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    const { data: cupom, error } = await supabaseAdmin
      .from("cupons")
      .select(
        `
        id,
        codigo,
        parceiro_id,
        tipo,
        percentual,
        ativo,
        plano,
        minimo_valor,
        maximo_desconto,
        limite_total,
        usos_total,
        valido_de,
        valido_ate
      `,
      )
      .eq("codigo", codigo)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }
    if (!cupom) {
      return NextResponse.json(
        { ok: false, error: "Cupom inválido." },
        { status: 404 },
      );
    }
    // ✅ valida se CNPJ pertence ao parceiro do cupom
    const { count: elegivel, error: elegivelError } = await supabaseAdmin
      .from("parceiros_empresas_elegiveis")
      .select("*", { count: "exact", head: true })
      .eq("parceiro_id", cupom.parceiro_id)
      .eq("cnpj", cnpj)
      .eq("ativo", true);

    if (elegivelError) {
      return NextResponse.json(
        { ok: false, error: "Erro ao validar elegibilidade do cupom." },
        { status: 500 },
      );
    }

    if ((elegivel ?? 0) === 0) {
      return NextResponse.json(
        { ok: false, error: "Este cupom não é válido para este CNPJ." },
        { status: 403 },
      );
    }
    if (!cupom.ativo) {
      return NextResponse.json(
        { ok: false, error: "Cupom inativo." },
        { status: 400 },
      );
    }

    // plano: se cupom.plano for null, vale para todos
    if (cupom.plano && cupom.plano !== plano) {
      return NextResponse.json(
        { ok: false, error: "Cupom não aplicável a este plano." },
        { status: 400 },
      );
    }

    // validade
    const now = new Date();
    if (cupom.valido_de && new Date(cupom.valido_de) > now) {
      return NextResponse.json(
        { ok: false, error: "Cupom ainda não está válido." },
        { status: 400 },
      );
    }
    if (cupom.valido_ate && new Date(cupom.valido_ate) < now) {
      return NextResponse.json(
        { ok: false, error: "Cupom expirado." },
        { status: 400 },
      );
    }

    // mínimo: banco está em BRL (numeric)
    if (cupom.minimo_valor !== null) {
      const minBRL = num(cupom.minimo_valor);
      const totalBRL = totalMensalCents / 100;
      if (totalBRL < minBRL) {
        return NextResponse.json(
          {
            ok: false,
            error: "Valor mínimo não atingido para usar este cupom.",
          },
          { status: 400 },
        );
      }
    }

    // limite global
    if (
      cupom.limite_total !== null &&
      cupom.usos_total >= cupom.limite_total - 1
    ) {
      return NextResponse.json(
        { ok: false, error: "Cupom esgotado." },
        { status: 400 },
      );
    }

    const tipo = String(cupom.tipo) as TipoCupom;
    const percentual = Math.max(0, num(cupom.percentual ?? 0));

    let descontoCents = 0;

    // ✅ regra segura
    if (tipo === "desconto" && percentual > 0) {
      descontoCents = Math.round(totalMensalCents * (percentual / 100));
    }

    // teto do desconto (maximo_desconto em BRL)
    if (cupom.maximo_desconto !== null) {
      const maxCents = Math.round(num(cupom.maximo_desconto) * 100);
      descontoCents = Math.min(descontoCents, maxCents);
    }

    descontoCents = Math.max(0, descontoCents);
    const totalComDescontoCents = Math.max(0, totalMensalCents - descontoCents);

    return NextResponse.json(
      {
        ok: true,
        codigo: cupom.codigo,
        tipo,
        percentual,
        descontoCents,
        totalComDescontoCents,
      },
      { status: 200 },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
