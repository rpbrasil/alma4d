import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getCaller } from "../../importacao-usuarios/_shared/getCaller";

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();

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
    const supabaseAdmin = getSupabaseAdmin();

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

    const digits = String(body.cnpj ?? "").replace(/\D/g, "");

    if (digits.length !== 14) {
      return NextResponse.json({ error: "CNPJ inválido" }, { status: 400 });
    }

    let razao_social: string | null = null;
    // ✅ 1. tentar cache
    const { data: cached } = await supabaseAdmin
      .from("cnpj_consultas")
      .select("razao_social")
      .eq("cnpj", digits)
      .maybeSingle();

    if (cached?.razao_social) {
      razao_social = cached.razao_social;
    }
    // ✅ 2. fallback → API
    if (!razao_social) {
      try {
        const res = await fetch(`${process.env.BASE_URL}/api/consultar-cnpj`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cnpj: digits,
            token: "server-internal", // simples (ajuste depois se quiser)
          }),
        });

        if (res.ok) {
          const data = await res.json();
          razao_social = data.razao_social ?? null;
        }
      } catch {
        // ignora erro
      }
    }
    // ✅ 3. fallback final (manual)
    if (!razao_social) {
      razao_social = null;
    }

    // body can be single object or array
    const rows = Array.isArray(body) ? body : [body];

    type EmpresaPayload = {
      parceiro_id?: string | null;
      cnpj?: string | null;
      razao_social?: string | null;
      ativo?: boolean | string | null;
    };

    // normalize: ensure cnpj digits only, percentual number
    const payload = [];

    for (const r of rows) {
      const row = r as EmpresaPayload;
      const cnpjDigits = String(row.cnpj ?? "").replace(/\D/g, "");

      // ✅ buscar cache
      let nomeFinal: string | null = null;

      const { data: cached } = await supabaseAdmin
        .from("cnpj_consultas")
        .select("razao_social")
        .eq("cnpj", cnpjDigits)
        .maybeSingle();

      if (cached?.razao_social) {
        nomeFinal = cached.razao_social;
      } else {
        // ✅ fallback simples (SEM API para bulk)
        nomeFinal = row.razao_social ?? null;
      }

      payload.push({
        parceiro_id: row.parceiro_id ?? null,
        cnpj: cnpjDigits,
        razao_social: nomeFinal, // ✅ agora correto
        ativo: row.ativo === undefined ? true : Boolean(row.ativo),
      });
    }

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
