import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCaller } from "../../importacao-usuarios/_shared/getCaller";

export async function GET(req: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    const q = supabaseAdmin
      .from("parceiros_empresas_elegiveis")
      .select("*")
      .order("cnpj");
    const { data, error } = await q;
    if (error)
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );

    return NextResponse.json({ ok: true, empresas: data });
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

    const token = auth.split(" ")[1];

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

    const body = await req.json();

    // body can be single object or array
    const rows = Array.isArray(body) ? body : [body];

    type EmpresaPayload = {
      parceiro_id?: string | null;
      cnpj?: string | null;
      nome?: string | null;
      percentual?: number | string | null;
      ativo?: boolean | string | null;
    };

    // normalize: ensure cnpj digits only, percentual number
    const payload = rows.map((r) => {
      const row = r as EmpresaPayload;
      return {
        parceiro_id: row.parceiro_id ?? null,
        cnpj: (row.cnpj ?? "").replace(/\D/g, ""),
        nome: row.nome ?? null,
        percentual:
          row.percentual === undefined || row.percentual === null
            ? null
            : Number(row.percentual),
        ativo: row.ativo === undefined ? true : Boolean(row.ativo),
      };
    });

    // insert in chunks of 200
    const chunkSize = 200;
    let inserted: Array<Record<string, unknown>> = [];
    for (let i = 0; i < payload.length; i += chunkSize) {
      const slice = payload.slice(i, i + chunkSize);
      const { data, error } = await supabaseAdmin
        .from("parceiros_empresas_elegiveis")
        .insert(slice)
        .select();
      if (error)
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 500 },
        );
      inserted = inserted.concat(data ?? []);
    }

    return NextResponse.json({ ok: true, inserted });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
