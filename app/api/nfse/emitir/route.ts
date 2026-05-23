import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ClienteRow = {
  id: string;
  nome: string;
  documento: string | null;
  email: string | null;
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
    const body = (await req.json()) as { contrato_id?: string };

    const contratoId = String(body.contrato_id ?? "");
    if (!contratoId) {
      return NextResponse.json(
        { error: "contrato_id obrigatório" },
        { status: 400 },
      );
    }

    // service role (backend)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    // Carrega contrato + cliente
    const { data: contrato } = await supabase
      .from("contratos")
      .select(
        "id, cliente_id, numero_contrato, versao, valor_total, valor_mensal",
      )
      .eq("id", contratoId)
      .maybeSingle();

    if (!contrato)
      return NextResponse.json(
        { error: "Contrato não encontrado" },
        { status: 404 },
      );

    const { data: cliente } = await supabase
      .from("clientes")
      .select("id, nome, documento, email")
      .eq("id", contrato.cliente_id)
      .single<ClienteRow>();

    if (!cliente)
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 },
      );

    // Busca snapshot da consulta de CNPJ pra endereço/UF/município
    // (você já grava em cnpj_consultas no /api/cnpj/consultar)
    const cnpjDigits = onlyDigits(String(cliente.documento ?? ""));
    const { data: snap } = await supabase
      .from("cnpj_consultas")
      .select("municipio, uf, cep, logradouro, numero, complemento, bairro")
      .eq("cnpj", cnpjDigits)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // ======= Config do PRESTADOR (sua empresa) =======
    // Esses campos são necessários na FocusNFe para prestador
    // (especialmente codigo_municipio) [1](https://doc.focusnfe.com.br/reference/emitir_nfse)
    const FOCUS_TOKEN = process.env.FOCUS_NFE_TOKEN!;
    const PRESTADOR_CNPJ = onlyDigits(process.env.NFSE_PRESTADOR_CNPJ ?? "");
    const PRESTADOR_IM = String(process.env.NFSE_PRESTADOR_IM ?? "");
    const PRESTADOR_COD_MUN = String(
      process.env.NFSE_PRESTADOR_CODIGO_MUNICIPIO ?? "",
    ); // 7 dígitos IBGE

    if (
      !FOCUS_TOKEN ||
      !PRESTADOR_CNPJ ||
      !PRESTADOR_IM ||
      !PRESTADOR_COD_MUN
    ) {
      return NextResponse.json(
        {
          error:
            "Config NFSe ausente (env: FOCUS_NFE_TOKEN / NFSE_PRESTADOR_*)",
        },
        { status: 500 },
      );
    }

    // ======= Ref e RPS =======
    // ref precisa ser única; use algo determinístico por contrato/versão
    const ref = `nfse_${contrato.id}_v${contrato.versao}`;

    // RPS: você pode começar simples e evoluir depois (sequência por prestador)
    const numero_rps = String(contrato.versao); // exemplo
    const serie_rps = "1";
    const tipo_rps = "1";

    // ======= Valores do serviço =======
    // use valor_total (se existir) senão valor_mensal
    const valor = Number(contrato.valor_total ?? contrato.valor_mensal ?? 0);
    if (!Number.isFinite(valor) || valor <= 0) {
      return NextResponse.json(
        { error: "Contrato sem valor para faturamento" },
        { status: 400 },
      );
    }

    // ======= Payload FocusNFe (NFSe Municipal) =======
    const payload = {
      data_emissao: new Date().toISOString(),
      natureza_operacao: "1",
      optante_simples_nacional: true, // ajuste conforme seu emitente
      incentivador_cultural: false,

      prestador: {
        cnpj: PRESTADOR_CNPJ,
        inscricao_municipal: PRESTADOR_IM,
        codigo_municipio: PRESTADOR_COD_MUN,
      },

      tomador: {
        cnpj: cnpjDigits,
        razao_social: String(cliente.nome ?? ""),
        email: cliente?.email ?? "",
        endereco: snap
          ? {
              logradouro: snap.logradouro ?? "",
              numero: snap.numero ?? "",
              complemento: snap.complemento ?? "",
              bairro: snap.bairro ?? "",
              codigo_municipio: PRESTADOR_COD_MUN, // se tiver IBGE do tomador, pode trocar
              uf: snap.uf ?? "",
              cep: snap.cep ?? "",
            }
          : undefined,
      },

      servico: {
        valor_servicos: valor,
        iss_retido: false,
        item_lista_servico: process.env.NFSE_ITEM_LISTA_SERVICO ?? "1.01",
        discriminacao: `Assinatura NR-1 / COPSOQ - Contrato ${contrato.numero_contrato}`,
        codigo_municipio: PRESTADOR_COD_MUN,
      },
    };

    // Persiste registro local antes de chamar (audit)
    await supabase.from("nfse_emissoes").upsert(
      {
        contrato_id: contrato.id,
        cliente_id: contrato.cliente_id,
        ref,
        cnpj_prestador: PRESTADOR_CNPJ,
        numero_rps,
        serie_rps,
        tipo_rps,
        status: "enviando",
        payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "ref" },
    );

    // Chama FocusNFe
    const resp = await fetch(
      `https://api.focusnfe.com.br/v2/nfse?ref=${encodeURIComponent(ref)}`,
      {
        method: "POST",
        headers: {
          Authorization: basicAuthHeader(FOCUS_TOKEN),
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    const data = await resp.json().catch(() => null);

    // Atualiza registro local com resposta
    await supabase
      .from("nfse_emissoes")
      .update({
        resposta: data,
        status: resp.ok ? (data?.status ?? "processando_autorizacao") : "erro",
        ultimo_erro: resp.ok ? null : (data?.mensagem ?? "Erro ao emitir NFSe"),
        updated_at: new Date().toISOString(),
      })
      .eq("ref", ref);

    if (!resp.ok) {
      // repassa erros conforme padrão FocusNFe (400/422 etc.)
      return NextResponse.json(
        {
          error: data?.mensagem ?? "Erro ao emitir NFSe",
          codigo: data?.codigo,
          detail: data,
        },
        { status: resp.status },
      );
    }

    // Exemplo de retorno aceito: status processando_autorizacao [2](https://doc.focusnfe.com.br/reference/consultar_nfse)
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
