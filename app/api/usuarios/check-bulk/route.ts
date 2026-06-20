import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCaller } from "../../importacao-usuarios/_shared/getCaller";

const CHUNK_SIZE = 500;

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization");

    if (!auth?.startsWith("Bearer ")) {
      return NextResponse.json(
        { ok: false, error: "Token ausente" },
        { status: 401 },
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    let caller;
    try {
        caller = await getCaller(req, supabaseAdmin);
        if (!["admin", "cliente", "gestor"].includes(caller.role)) {
        return NextResponse.json(
          { ok: false, error: "Acesso negado" },
          { status: 403 },
        );
      }
    } catch {
      return NextResponse.json(
        { ok: false, error: "Acesso negado" },
        { status: 403 },
      );
    }

    const body = await req.json();

    const documentos: string[] = body.documentos ?? [];
    const telefones: string[] = body.telefones ?? [];

    const docsFound = new Set<string>();
    const telsFound = new Set<string>();

    // ✅ função de chunk
    function chunkArray<T>(arr: T[], size: number): T[][] {
      const chunks = [];
      for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
      }
      return chunks;
    }

    const docChunks = chunkArray(documentos, CHUNK_SIZE);
    const telChunks = chunkArray(telefones, CHUNK_SIZE);

    // ✅ processa documentos
    for (const chunk of docChunks) {
      if (!chunk.length) continue;

      const { data } = await supabaseAdmin
        .from("usuarios")
        .select("documento")
        .in("documento", chunk);

      for (const row of data ?? []) {
        if (row.documento) docsFound.add(row.documento);
      }
    }

    // ✅ processa telefones
    for (const chunk of telChunks) {
      if (!chunk.length) continue;

      const { data } = await supabaseAdmin
        .from("usuarios")
        .select("telefone")
        .in("telefone", chunk);

      for (const row of data ?? []) {
        if (row.telefone) telsFound.add(row.telefone);
      }
    }

    return NextResponse.json({
      ok: true,
      documentos: Array.from(docsFound),
      telefones: Array.from(telsFound),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno";

    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
