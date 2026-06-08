import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function onlyDigits(v: string) {
  return (v || "").replace(/\D/g, "");
}

function basicAuthHeader(token: string) {
  const auth = Buffer.from(`${token}:`, "utf8").toString("base64");
  return `Basic ${auth}`;
}

export async function POST(req: Request) {
  try {
    const { contrato_id } = await req.json();

    if (!contrato_id) {
      return NextResponse.json(
        { error: "contrato_id obrigatório" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    // ✅ 1. Buscar contrato
    const { data: contrato } = await supabase
      .from("contratos")
      .select(
        "id, cliente_id, numero_contrato, versao, valor_total, valor_mensal",
      )
      .eq("id", contrato_id)
      .single();

    if (!contrato) {
      return NextResponse.json(
        { error: "Contrato não encontrado" },
        { status: 404 },
      );
    }

    // ✅ 2. ID + REF (idempotência forte)
    const ref = `nfse_${contrato.id}_v${contrato.versao}`;

    // ✅ 3. VERIFICA se já existe NFSe
    const { data: existing } = await supabase
      .from("nfse_emissoes")
      .select("id, status")
      .eq("ref", ref)
      .maybeSingle();

    if (existing && existing.status !== "erro") {
      console.log("[NFSE] já existe, ignorando:", ref);

      return NextResponse.json({
        ok: true,
        reused: true,
        ref,
      });
    }

    // ✅ 4. buscar cliente
    const { data: cliente } = await supabase
      .from("clientes")
      .select("id, nome, documento, email")
      .eq("id", contrato.cliente_id)
      .single();

    if (!cliente) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 },
      );
    }

    // ✅ 5. documento correto (CPF ou CNPJ)
    const doc = onlyDigits(cliente.documento ?? "");
    const tomadorBase = doc.length === 11 ? { cpf: doc } : { cnpj: doc };

    // ✅ 6. snapshot endereço
    const { data: snap } = await supabase
      .from("cnpj_consultas")
      .select("municipio, uf, cep, logradouro, numero, complemento, bairro")
      .eq("cnpj", doc)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // ✅ 7. ENV
    const TOKEN = process.env.FOCUS_NFE_TOKEN!;
    const PRESTADOR_CNPJ = onlyDigits(process.env.NFSE_PRESTADOR_CNPJ ?? "");
    const PRESTADOR_IM = process.env.NFSE_PRESTADOR_IM!;
    const COD_MUN = process.env.NFSE_PRESTADOR_CODIGO_MUNICIPIO!;

    // ✅ 8. VALOR
    const valor = Number(contrato.valor_total ?? contrato.valor_mensal ?? 0);

    if (!valor || valor <= 0) {
      return NextResponse.json(
        { error: "Contrato sem valor" },
        { status: 400 },
      );
    }

    // ✅ 9. PAYLOAD FINAL
    const payload = {
      data_emissao: new Date().toISOString(),
      natureza_operacao: "1",
      optante_simples_nacional: true,
      incentivador_cultural: false,

      prestador: {
        cnpj: PRESTADOR_CNPJ,
        inscricao_municipal: PRESTADOR_IM,
        codigo_municipio: COD_MUN,
      },

      tomador: {
        ...tomadorBase,
        razao_social: cliente.nome,
        email: cliente.email ?? "",
        endereco: snap
          ? {
              logradouro: snap.logradouro ?? "",
              numero: snap.numero ?? "",
              complemento: snap.complemento ?? "",
              bairro: snap.bairro ?? "",
              codigo_municipio: COD_MUN, // (pode evoluir depois)
              uf: snap.uf ?? "",
              cep: snap.cep ?? "",
            }
          : undefined,
      },

      servico: {
        valor_servicos: valor,
        iss_retido: false,
        item_lista_servico: process.env.NFSE_ITEM_LISTA_SERVICO ?? "1.01",
        discriminacao: `Contrato ${contrato.numero_contrato || contrato.id}`,
        codigo_municipio: COD_MUN,
      },
    };

    // ✅ 10. salvar pré-envio
    await supabase.from("nfse_emissoes").upsert(
      {
        contrato_id: contrato.id,
        cliente_id: contrato.cliente_id,
        ref,
        status: "enviando",
        valor,
        payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "ref" },
    );

    // ✅ 11. chamada Focus
    const resp = await fetch(`https://api.focusnfe.com.br/v2/nfse?ref=${ref}`, {
      method: "POST",
      headers: {
        Authorization: basicAuthHeader(TOKEN),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await resp.json().catch(() => null);

    // ✅ 12. atualizar resposta
    await supabase
      .from("nfse_emissoes")
      .update({
        resposta: data,
        status: resp.ok ? (data?.status ?? "processando_autorizacao") : "erro",
        ultimo_erro: resp.ok ? null : data?.mensagem,
        updated_at: new Date().toISOString(),
      })
      .eq("ref", ref);

    if (!resp.ok) {
      return NextResponse.json(
        {
          error: data?.mensagem ?? "Erro na emissão",
          detail: data,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        ref,
        status: data?.status,
      },
      { status: 201 },
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Erro interno",
      },
      { status: 500 },
    );
  }
}
