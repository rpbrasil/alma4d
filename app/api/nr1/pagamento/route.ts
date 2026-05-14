import { NextResponse } from "next/server";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [k: string]: JsonValue }
  | JsonValue[];

function safeJsonParse(text: string): JsonValue | { raw: string } {
  try {
    return text ? (JSON.parse(text) as JsonValue) : null;
  } catch {
    return { raw: text };
  }
}

function errorMessage(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;

    const user_id = String(body.user_id ?? "");
    const cliente_id = String(body.cliente_id ?? "");
    const contrato_id = String(body.contrato_id ?? "");
    const funcionarios = Number(body.funcionarios ?? 0);
    const payment_method = String(body.payment_method ?? "");
    const cupom_codigo = body.cupom_codigo ? String(body.cupom_codigo) : null;

    const email = body.email ? String(body.email) : "";
    const nome_completo = body.nome_completo
      ? String(body.nome_completo)
      : null;
    const documento = body.documento ? String(body.documento) : null;
    const sexo = body.sexo ? String(body.sexo) : null;
    const data_nascimento = body.data_nascimento
      ? String(body.data_nascimento)
      : null;
    const telefone = body.telefone ? String(body.telefone) : null;

    const origem = body.origem ? String(body.origem) : null;
    const campanha = body.campanha ? String(body.campanha) : null;

    if (!user_id)
      return NextResponse.json({ error: "user_id ausente" }, { status: 400 });
    if (!cliente_id)
      return NextResponse.json(
        { error: "cliente_id ausente" },
        { status: 400 },
      );
    if (!contrato_id)
      return NextResponse.json(
        { error: "contrato_id ausente" },
        { status: 400 },
      );
    if (!Number.isInteger(funcionarios) || funcionarios <= 2) {
      return NextResponse.json(
        { error: "É necessário no mínimo 2 funcionários para contratar." },
        { status: 400 },
      );
    }
    if (payment_method !== "pix" && payment_method !== "boleto") {
      return NextResponse.json(
        { error: "payment_method inválido" },
        { status: 400 },
      );
    }
    if (!email.trim())
      return NextResponse.json(
        { error: "email é obrigatório" },
        { status: 400 },
      );

    const AZURE_NR1_URL = process.env.AZURE_NR1_URL;
    if (!AZURE_NR1_URL) {
      return NextResponse.json(
        { error: "AZURE_NR1_URL não configurada" },
        { status: 500 },
      );
    }

    const payloadToAzure = {
      user_id,
      product_id: "nr1_psicossocial",
      cliente_id,
      contrato_id,
      funcionarios,
      payment_method,
      cupom_codigo,

      email: email.trim(),
      nome_completo,
      documento,
      sexo,
      data_nascimento,
      telefone,

      origem,
      campanha,
    };

    const resp = await fetch(AZURE_NR1_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadToAzure),
    });

    const text = await resp.text();
    const json = safeJsonParse(text);

    if (!resp.ok) {
      return NextResponse.json(
        { error: "Azure Function recusou", detail: json },
        { status: resp.status },
      );
    }

    return NextResponse.json(json, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: errorMessage(e, "Erro interno") },
      { status: 500 },
    );
  }
}
