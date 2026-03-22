import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CheckoutBody = {
  userId: string;
  nome_completo?: string | null;
  telefone?: string | null;
  email?: string | null;
  origem?: string | null;
  campanha?: string | null;
  tipo_plano?: string | null;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export async function POST(req: Request) {
  // ✅ body é usado (não gera no-unused-vars)
  let body: CheckoutBody;

  try {
    body = (await req.json()) as CheckoutBody;
  } catch {
    return jsonError("Body inválido (JSON esperado).", 400);
  }

  if (!isNonEmptyString(body.userId)) {
    return jsonError("Campo obrigatório ausente: userId.", 400);
  }

  const baseUrl = process.env.PAGARME_CHECKOUT_BASE_URL;

  if (!isNonEmptyString(baseUrl)) {
    return jsonError(
      "PAGARME_CHECKOUT_BASE_URL não configurada no ambiente do servidor.",
      501,
    );
  }

  // Monta URL de checkout com tracking (stub seguro)
  const url = new URL(baseUrl);

  url.searchParams.set("uid", body.userId);

  if (isNonEmptyString(body.tipo_plano))
    url.searchParams.set("plano", body.tipo_plano);
  if (isNonEmptyString(body.origem))
    url.searchParams.set("origem", body.origem);
  if (isNonEmptyString(body.campanha))
    url.searchParams.set("campanha", body.campanha);

  if (isNonEmptyString(body.nome_completo))
    url.searchParams.set("nome", body.nome_completo);
  if (isNonEmptyString(body.email)) url.searchParams.set("email", body.email);
  if (isNonEmptyString(body.telefone))
    url.searchParams.set("tel", body.telefone);

  return NextResponse.json(
    { ok: true, url: url.toString() },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
