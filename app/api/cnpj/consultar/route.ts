import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/verify-turnstile";

export async function POST(req: Request) {
  const ip =
    (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    "127.0.0.1";

  const { success } = rateLimit(ip);
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await req.json();
    const token = body?.token;
    const cnpj = body?.cnpj;

    if (!token) {
      return NextResponse.json(
        { error: "Captcha obrigatório" },
        { status: 400 },
      );
    }

    const verify = await verifyTurnstile(token);

    if (!verify.ok) {
      // 🔥 aqui você vai enxergar o motivo real
      return NextResponse.json(
        {
          error: "turnstile_failed",
          codes: verify.codes,
          hostname: verify.hostname,
        },
        { status: 403 },
      );
    }

    const digits = String(cnpj ?? "").replace(/\D/g, "");
    if (digits.length !== 14) {
      return NextResponse.json({ error: "CNPJ inválido" }, { status: 400 });
    }
    const focusToken = process.env.FOCUS_NFE_TOKEN!;
    const auth = Buffer.from(`${focusToken}:`).toString("base64");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(
      `https://api.focusnfe.com.br/v2/cnpjs/${digits}`,
      {
        headers: { Authorization: `Basic ${auth}` },
        signal: controller.signal,
      },
    );

    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json(
        { error: "CNPJ não encontrado" },
        { status: 404 },
      );
    }

    const data = await response.json();

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
