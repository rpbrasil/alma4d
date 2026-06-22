import { NextResponse } from "next/server";

/**
 * Verifica o header `x-internal-secret` contra a env var `INTERNAL_API_SECRET`.
 * Retorna `null` quando OK, ou um `NextResponse` para ser retornado diretamente.
 */
export function requireInternalSecret(req: Request) {
  const expected = process.env.INTERNAL_API_SECRET;
  if (!expected) {
    console.warn("INTERNAL_API_SECRET não está configurado");
    return NextResponse.json(
      { error: "Internal secret not configured" },
      { status: 500 },
    );
  }

  const provided = req.headers.get("x-internal-secret") ?? "";
  if (provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
