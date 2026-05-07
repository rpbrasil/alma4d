import { NextResponse } from "next/server";

function basicAuth(apiKey: string) {
  return `Basic ${Buffer.from(apiKey + ":").toString("base64")}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("order_id");

  if (!orderId) {
    return NextResponse.json({ error: "order_id ausente" }, { status: 400 });
  }

  const apiKey = process.env.PAGARME_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "PAGARME_API_KEY não configurada" },
      { status: 500 },
    );
  }

  const resp = await fetch(`https://api.pagar.me/core/v5/orders/${orderId}`, {
    method: "GET",
    headers: {
      Authorization: basicAuth(apiKey),
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const text = await resp.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!resp.ok) {
    return NextResponse.json(
      { error: "Falha ao obter pedido", detail: data },
      { status: resp.status },
    );
  }

  return NextResponse.json({ order: data }, { status: 200 });
}
