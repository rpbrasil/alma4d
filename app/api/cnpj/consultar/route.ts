import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/verify-turnstile";

type CnpjConsultaInsert = {
  cnpj: string;
  razao_social?: string;
  situacao_cadastral?: string;
  cnae_principal?: string;
  optante_simples?: boolean;
  optante_mei?: boolean;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  municipio?: string | null; // nome
  uf?: string | null;
  cep?: string | null;
  codigo_municipio?: string | null; // IBGE municipal usado na NFSe
  codigo_ibge?: string | null;
  codigo_siafi?: string | null;
  raw: Record<string, unknown>;
};

export async function POST(req: Request) {
  const ip =
    (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    "127.0.0.1";

  const { success } = rateLimit(ip);
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = (await req.json()) as {
      token?: string;
      cnpj?: string;
    };
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
    const focusToken = process.env.FOCUS_NFE_TOKEN;

    if (!focusToken) {
      return NextResponse.json(
        { error: "Configuração Focus NFE ausente" },
        { status: 500 },
      );
    }

    const auth = Buffer.from(`${focusToken}:`).toString("base64");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const supabase = getSupabaseAdmin();
    const { data: cached } = await supabase
      .from("cnpj_consultas")
      .select("raw")
      .eq("cnpj", digits)
      .maybeSingle();

    if (cached?.raw) {
      console.log("✅ CNPJ vindo do cache");
      return NextResponse.json(cached.raw);
    }

    let response;

    try {
      response = await fetch(`https://api.focusnfe.com.br/v2/cnpjs/${digits}`, {
        headers: { Authorization: `Basic ${auth}` },
        signal: controller.signal,
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return NextResponse.json(
          { error: "Timeout ao consultar CNPJ" },
          { status: 504 },
        );
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: "CNPJ não encontrado" },
        { status: 404 },
      );
    }

    const data = await response.json();

    //const supabase = getSupabaseAdmin();

    const { error: insertErr } = await supabase.from("cnpj_consultas").upsert(
      [
        {
          cnpj: digits,
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
          codigo_municipio: data.endereco?.codigo_municipio,
          codigo_ibge: data.endereco?.codigo_ibge,
          codigo_siafi: data.endereco?.codigo_siafi,
          raw: data,
        } as CnpjConsultaInsert,
      ],
      { onConflict: "cnpj" },
    );

    if (insertErr) {
      console.warn("Erro ao salvar cnpj_consultas:", insertErr.message);
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Erro consultar CNPJ:", err);
    return NextResponse.json(
      { error: "Erro ao consultar CNPJ" },
      { status: 500 },
    );
  }
}
