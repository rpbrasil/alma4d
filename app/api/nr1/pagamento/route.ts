import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [k: string]: JsonValue }
  | JsonValue[];

type ParsedJson = JsonValue | { raw: string };

function safeJsonParse(text: string): ParsedJson {
  try {
    return text ? (JSON.parse(text) as JsonValue) : null;
  } catch {
    return { raw: text };
  }
}

function errorMessage(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

function onlyDigits(v: string) {
  return (v || "").replace(/\D/g, "");
}

function isJsonObject(v: ParsedJson): v is { [k: string]: JsonValue } {
  return (
    typeof v === "object" && v !== null && !Array.isArray(v) && !("raw" in v)
  );
}

function getJsonString(
  obj: { [k: string]: JsonValue },
  key: string,
): string | null {
  const v = obj[key];
  return typeof v === "string" ? v : null;
}

/**
 * ✅ Suporta objetos + arrays (charges[0], etc).
 */
function getNestedValue(
  root: { [k: string]: JsonValue },
  path: Array<string | number>,
): JsonValue | null {
  let cur: JsonValue = root;

  for (const seg of path) {
    if (typeof seg === "number") {
      if (!Array.isArray(cur)) return null;
      cur = cur[seg] ?? null;
      continue;
    }

    // seg é string
    if (typeof cur !== "object" || cur === null || Array.isArray(cur))
      return null;
    cur = (cur as { [k: string]: JsonValue })[seg] ?? null;
  }

  return cur ?? null;
}

function getNestedString(
  root: { [k: string]: JsonValue },
  path: Array<string | number>,
): string | null {
  const v = getNestedValue(root, path);
  return typeof v === "string" ? v : null;
}

export async function POST(req: Request) {
  const AZURE_NR1_URL = process.env.AZURE_NR1_URL;

  try {
    const body = (await req.json()) as Record<string, unknown>;

    // ✅ auth obrigatório (não confia em user_id vindo do client)
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Token ausente" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    const { data: userWrap, error: authErr } =
      await supabaseAdmin.auth.getUser(token);
    if (authErr || !userWrap?.user?.id) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }
    const callerId = userWrap.user.id;

    const { data: caller } = await supabaseAdmin
      .from("usuarios")
      .select("id, role, cliente_id, ativo, tipo_plano")
      .eq("id", callerId)
      .maybeSingle();

    if (!caller) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 401 },
      );
    }

    const isOnboarding =
      caller.ativo === false &&
      (caller.tipo_plano === "express" || caller.tipo_plano === "trial");

    if (!caller.ativo && !isOnboarding) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const cliente_id = String(body.cliente_id ?? "");
    const contrato_id = String(body.contrato_id ?? "");
    const funcionarios = Number(body.funcionarios ?? 0);

    const payment_method = String(body.payment_method ?? "");
    const cupom_codigo = body.cupom_codigo
      ? String(body.cupom_codigo).trim().toUpperCase()
      : null;

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

    if (!cliente_id) {
      return NextResponse.json(
        { error: "cliente_id ausente" },
        { status: 400 },
      );
    }
    if (!contrato_id) {
      return NextResponse.json(
        { error: "contrato_id ausente" },
        { status: 400 },
      );
    }

    if (!Number.isInteger(funcionarios) || funcionarios < 2) {
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

    if (!email.trim()) {
      return NextResponse.json(
        { error: "email é obrigatório" },
        { status: 400 },
      );
    }

    if (!AZURE_NR1_URL) {
      return NextResponse.json(
        { error: "AZURE_NR1_URL não configurada" },
        { status: 500 },
      );
    }

    // ✅ tenant guard
    if (
      caller.role !== "admin" &&
      String(caller.cliente_id) !== String(cliente_id)
    ) {
      return NextResponse.json({ error: "Tenant inválido" }, { status: 403 });
    }

    // ✅ contrato pertence ao cliente
    const { data: contrato } = await supabaseAdmin
      .from("contratos")
      .select("id, cliente_id, criado_por, status")
      .eq("id", contrato_id)
      .maybeSingle();

    if (!contrato) {
      return NextResponse.json(
        { error: "Contrato não encontrado" },
        { status: 404 },
      );
    }
    if (String(contrato.cliente_id) !== String(cliente_id)) {
      return NextResponse.json(
        { error: "Contrato de outro cliente" },
        { status: 403 },
      );
    }
    if (
      caller.role !== "admin" &&
      String(contrato.criado_por) !== String(callerId)
    ) {
      return NextResponse.json(
        { error: "Sem permissão para este contrato" },
        { status: 403 },
      );
    }

    // ✅ antifraude: conta usuários ativos reais do cliente
    const { count } = await supabaseAdmin
      .from("usuarios")
      .select("id", { count: "exact", head: true })
      .eq("cliente_id", cliente_id)
      .eq("role", "usuario")
      .eq("ativo", true);

    const usuariosReais = count ?? 0;

    const funcionariosSolicitados = Number(body.funcionarios ?? 0);
    if (
      !Number.isInteger(funcionariosSolicitados) ||
      funcionariosSolicitados < 2
    ) {
      return NextResponse.json(
        { error: "É necessário no mínimo 2 funcionários para contratar." },
        { status: 400 },
      );
    }

    if (!isOnboarding && usuariosReais < 2) {
      return NextResponse.json(
        { error: "É necessário no mínimo 2 usuários ativos para contratar." },
        { status: 400 },
      );
    }

    const funcionariosParaPagamento = isOnboarding
      ? funcionariosSolicitados
      : usuariosReais;

    // ✅ pega CNPJ real do cliente
    const { data: cliente } = await supabaseAdmin
      .from("clientes")
      .select("documento")
      .eq("id", cliente_id)
      .maybeSingle();

    const cnpj = onlyDigits(String(cliente?.documento ?? ""));
    if (cnpj.length !== 14) {
      return NextResponse.json(
        { error: "CNPJ do cliente inválido" },
        { status: 400 },
      );
    }

    // ✅ Reserva antifraude do cupom antes do pagamento
    if (cupom_codigo) {
      const { error: cupomErr } = await supabaseAdmin.rpc("reserve_cupom_pj", {
        p_codigo: cupom_codigo,
        p_cliente_id: cliente_id,
        p_contrato_id: contrato_id,
        p_cnpj: cnpj,
      });

      if (cupomErr) {
        return NextResponse.json(
          { error: cupomErr.message || "Cupom inválido/inelegível" },
          { status: 400 },
        );
      }
    }

    // ✅ payload para Azure (limpo)
    const payloadToAzure = {
      user_id: callerId,
      product_id: "nr1_psicossocial",
      cliente_id,
      contrato_id,
      funcionarios: funcionariosParaPagamento,
      payment_method,
      cupom_codigo,
      total_amount_cents: Number(body.total_amount_cents ?? 0),
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
    const parsed = safeJsonParse(text);

    if (!resp.ok) {
      if (cupom_codigo) {
        await supabaseAdmin.rpc("cancelar_reserva_cupom", {
          p_contrato_id: contrato_id,
          p_codigo: cupom_codigo,
        });
      }

      return NextResponse.json(
        { error: "Azure Function recusou", detail: parsed },
        { status: resp.status },
      );
    }

    // ✅ Normaliza objeto (se não for objeto, ainda retornamos para o client)
    const jsonObj = isJsonObject(parsed) ? parsed : null;

    // ✅ Variáveis fora do escopo, para usar em todo o bloco
    let orderId: string | null = null;
    let orderStatus = "pending";
    let paymentMethodFromAzure = payment_method;

    // ✅ Artefatos (pix/boleto)
    let qrCodeUrl: string | null = null;
    let qrCode: string | null = null;
    let expiresAt: string | null = null;
    let boletoUrl: string | null = null;
    let line: string | null = null;

    if (jsonObj) {
      orderId =
        getJsonString(jsonObj, "order_id") ??
        getNestedString(jsonObj, ["order", "id"]);
      orderStatus = (
        getJsonString(jsonObj, "order_status") ??
        getNestedString(jsonObj, ["order", "status"]) ??
        "pending"
      ).toLowerCase();

      paymentMethodFromAzure = (
        getJsonString(jsonObj, "payment_method") ?? payment_method
      ).toLowerCase();

      // ✅ agora funciona porque suporta arrays (charges[0])
      qrCodeUrl = getNestedString(jsonObj, [
        "order",
        "charges",
        0,
        "last_transaction",
        "qr_code_url",
      ]);
      qrCode = getNestedString(jsonObj, [
        "order",
        "charges",
        0,
        "last_transaction",
        "qr_code",
      ]);
      expiresAt = getNestedString(jsonObj, [
        "order",
        "charges",
        0,
        "last_transaction",
        "expires_at",
      ]);

      boletoUrl = getNestedString(jsonObj, [
        "order",
        "charges",
        0,
        "last_transaction",
        "boleto_url",
      ]);
      line = getNestedString(jsonObj, [
        "order",
        "charges",
        0,
        "last_transaction",
        "line",
      ]);
    }

    // ✅ Vincula contrato + cria 1 único evento (com artefatos)
    if (orderId) {
      const totalAmountCents = Number(body.total_amount_cents ?? 0);
      const totalAmountBRL =
        totalAmountCents > 0 ? totalAmountCents / 100 : null;

      await supabaseAdmin
        .from("contratos")
        .update({
          pagarme_order_id: orderId,
          pagarme_payment_status: orderStatus,
          forma_pagamento: paymentMethodFromAzure,
          ...(totalAmountBRL != null && !Number.isNaN(totalAmountBRL)
            ? {
                valor_total: totalAmountBRL,
                valor_mensal: totalAmountBRL,
              }
            : {}),
          ...(cupom_codigo ? { cupom_codigo } : {}),
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", contrato_id);
      console.log("CRIANDO EVENTO", {
        contrato_id,
        orderId,
      });
      await supabaseAdmin.from("contrato_eventos").insert({
        contrato_id,
        tipo: paymentMethodFromAzure === "pix" ? "pix_gerado" : "boleto_gerado",
        descricao: "Pagamento iniciado (Azure OK)",
        dados: {
          pagarme_order_id: orderId,
          pagarme_payment_status: orderStatus,
          forma_pagamento: paymentMethodFromAzure,
          origem,
          campanha,
          pix:
            paymentMethodFromAzure === "pix"
              ? {
                  qr_code_url: qrCodeUrl,
                  qr_code: qrCode,
                  expires_at: expiresAt,
                }
              : null,
          boleto:
            paymentMethodFromAzure === "boleto"
              ? { boleto_url: boletoUrl, line }
              : null,
        },
      });
    } else {
      console.warn("[api/nr1/pagamento] Azure OK, mas sem order_id/order.id", {
        contrato_id,
        parsed,
      });
    }

    // ✅ devolve o payload do Azure como veio
    return NextResponse.json(parsed, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: errorMessage(e, "Erro interno") },
      { status: 500 },
    );
  }
}
