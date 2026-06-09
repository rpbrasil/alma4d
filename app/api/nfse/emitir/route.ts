import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type CnpjSnapshot = {
  municipio: string | null;
  uf: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  codigo_ibge: string | null;
};

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

    if (
      existing &&
      ["emitida", "processando_autorizacao"].includes(existing.status)
    ) {
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
    const snapResult = await supabase
      .from("cnpj_consultas")
      .select(
        "municipio, uf, cep, logradouro, numero, complemento, bairro, codigo_ibge",
      )
      .eq("cnpj", doc)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<CnpjSnapshot>();
    const snap: CnpjSnapshot | null = snapResult.data ?? null;

    // ✅ 7. ENV
    const TOKEN = process.env.FOCUS_NFE_TOKEN!;
    const PRESTADOR_CNPJ = onlyDigits(process.env.NFSE_PRESTADOR_CNPJ ?? "");
    const PRESTADOR_IM = process.env.NFSE_PRESTADOR_IM!;
    const COD_MUN = process.env.NFSE_PRESTADOR_CODIGO_MUNICIPIO!; //ibge!!
    const ALIQUOTA = Number(process.env.NFSE_ALIQUOTA ?? 2);
    // ✅ 8. VALOR
    const valor = Number(contrato.valor_total ?? contrato.valor_mensal ?? 0);

    if (!TOKEN || !PRESTADOR_CNPJ || !PRESTADOR_IM || !COD_MUN) {
      throw new Error("Configuração NFSe inválida");
    }

    if (!valor || valor <= 0) {
      return NextResponse.json(
        { error: "Contrato sem valor" },
        { status: 400 },
      );
    }
    const numeroRps = String(Date.now());
    // ✅ 9. PAYLOAD FINAL
    const payload = {
      data_emissao: new Date().toISOString(),
      natureza_operacao: "1",

      numero_rps: numeroRps,
      serie_rps: "A",
      tipo_rps: "1",

      optante_simples_nacional: process.env.NFSE_OPTANTE_SIMPLES === "true",
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
              codigo_municipio: snap?.codigo_ibge ?? COD_MUN,
              uf: snap.uf ?? "",
              cep: snap.cep ?? "",
            }
          : undefined,
      },

      servico: {
        valor_servicos: valor,
        iss_retido: false,
        aliquota: ALIQUOTA,
        iss: Number((valor * (ALIQUOTA / 100)).toFixed(2)),
        item_lista_servico: process.env.NFSE_ITEM_LISTA_SERVICO ?? "04030",
        discriminacao: `Cessão de direito de uso de programas de computação - Contrato ${contrato.numero_contrato || contrato.id}`,
        codigo_municipio: COD_MUN,
      },
    };

    // ✅ 10. salvar pré-envio
    const { error: preErr } = await supabase.from("nfse_emissoes").upsert(
      {
        contrato_id: contrato.id,
        cliente_id: contrato.cliente_id,
        ref,
        status: "enviando",
        valor,
        payload,
        updated_at: new Date().toISOString(),

        numero_rps: String(Date.now()),
        serie_rps: "A",
        tipo_rps: "1",
        cnpj_prestador: PRESTADOR_CNPJ,
      },
      { onConflict: "ref" },
    );

    if (preErr) {
      throw new Error(preErr.message);
    }

    // ✅ 11. chamada Focus
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    let resp;

    try {
      resp = await fetch(`https://api.focusnfe.com.br/v2/nfse?ref=${ref}`, {
        method: "POST",
        headers: {
          Authorization: basicAuthHeader(TOKEN),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error("Timeout ao emitir NFSe");
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }

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
        status: data?.status ?? "processando_autorizacao",
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
