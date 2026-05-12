import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { cnpj } = await req.json();
    const digits = cnpj?.replace(/\D/g, "");
    if (!digits || digits.length !== 14) {
      return NextResponse.json({ error: "CNPJ inválido" }, { status: 400 });
    }
    // 🔐 AUTH BASIC (token = username)
    const token = process.env.FOCUS_NFE_TOKEN!;
    const auth = btoa(`${token}:`);
    //const auth = Buffer.from(`${token}:`).toString("base64");
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5000);
    const response = await fetch(
      `https://api.focusnfe.com.br/v2/cnpjs/${digits}`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "CNPJ não encontrado" },
        { status: 404 },
      );
    }
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.mensagem || "CNPJ não encontrado" },
        { status: response.status },
      );
    }

    // ✅ salvar snapshot
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    await supabase.from("cnpj_consultas").insert({
      cnpj: data.cnpj,
      razao_social: data.razao_social,
      situacao_cadastral: data.situacao_cadastral,
      cnae_principal: data.cnae_principal,
      optante_simples: data.optante_simples_nacional,
      optante_mei: data.optante_mei,

      logradouro: data.endereco?.logradouro,
      numero: data.endereco?.numero,
      complemento: data.endereco?.complemento,
      bairro: data.endereco?.bairro,
      municipio: data.endereco?.nome_municipio,
      uf: data.endereco?.uf,
      cep: data.endereco?.cep,

      raw: data,
    });

    return NextResponse.json(data);
  } catch (err) {
    console.error("Erro consultar CNPJ:", err);

    return NextResponse.json(
      { error: "Erro ao consultar CNPJ" },
      { status: 500 },
    );
  }
}
