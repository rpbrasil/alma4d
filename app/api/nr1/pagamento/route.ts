import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

function onlyDigits(v: string) {
  return (v || "").replace(/\D/g, "");
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

    if (!caller || !caller.ativo) {
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

    // ✅ regra mínimo 2 (corrigida)
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
    if (usuariosReais < 2) {
      return NextResponse.json(
        { error: "É necessário no mínimo 2 usuários ativos para contratar." },
        { status: 400 },
      );
    }

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
      funcionarios: usuariosReais,
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
      // se Azure falhar, cancela a reserva
      if (cupom_codigo) {
        await supabaseAdmin.rpc("cancelar_reserva_cupom", {
          p_contrato_id: contrato_id,
          p_codigo: cupom_codigo,
        });
      }

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
