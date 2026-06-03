import { NextResponse } from "next/server";
import { getConfigInternal } from "@/lib/precificacao/config-core";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const plano = url.searchParams.get("plano") || "express";

    const config = await getConfigInternal(plano);

    return NextResponse.json(
      { ok: true, config },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
