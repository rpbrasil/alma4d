import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCaller } from "../importacao-usuarios/_shared/getCaller";

export async function GET() {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    const { data, error } = await supabaseAdmin
      .from("cupons")
      .select("*, parceiros(*)")
      .order("codigo");
    if (error)
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    return NextResponse.json({ ok: true, cupons: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Token ausente" }, { status: 401 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    let caller;
    try {
      caller = await getCaller(req, supabaseAdmin);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === "NO_TOKEN" || msg === "INVALID_TOKEN")
        return NextResponse.json({ error: "Token inválido" }, { status: 401 });
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    if (caller.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const payload = {
      codigo: (body.codigo ?? "").toString().toUpperCase(),
      parceiro_id:
        typeof body.parceiro_id === "string" ? body.parceiro_id : null,
      tipo: typeof body.tipo === "string" ? body.tipo : "desconto",
      valor: typeof body.valor === "number" ? body.valor : 0,
      ativo: typeof body.ativo === "boolean" ? body.ativo : true,
      comissao_percentual: body.comissao_percentual,
      plano: typeof body.plano === "string" ? body.plano : null,
      valido_de: typeof body.valido_de === "string" ? body.valido_de : null,
      valido_ate: typeof body.valido_ate === "string" ? body.valido_ate : null,
    };

    const { data, error } = await supabaseAdmin
      .from("cupons")
      .insert([payload])
      .select()
      .maybeSingle();
    if (error)
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );

    return NextResponse.json({ ok: true, cupom: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
