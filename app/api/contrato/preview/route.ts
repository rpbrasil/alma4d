import { NextResponse } from "next/server";
import { generateContratoHTML } from "@/lib/contratoTemplate";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const contratoId = searchParams.get("contratoId") || "";

  if (!contratoId) {
    return NextResponse.json(
      { error: "contratoId é obrigatório" },
      { status: 400 },
    );
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const { data: contrato, error: contratoErr } = await supabase
    .from("contratos")
    .select("*")
    .eq("id", contratoId)
    .single();

  if (contratoErr || !contrato) {
    return NextResponse.json(
      { error: "Contrato não encontrado" },
      { status: 404 },
    );
  }

  const { data: cliente } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", contrato.cliente_id)
    .single();

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", contrato.criado_por)
    .single();

  // Termos: preferir termos_html salvo; fallback para arquivo
  let termosHtml = contrato.termos_html ?? "";
  if (!termosHtml) {
    const termosPath = path.join(
      process.cwd(),
      "public",
      "legal",
      "terms.html",
    );
    termosHtml = fs.readFileSync(termosPath, "utf-8");
  }

  const privacidadePath = path.join(
    process.cwd(),
    "public",
    "legal",
    "privacy.html",
  );
  const privacidadeHtml = fs.readFileSync(privacidadePath, "utf-8");

  // preview hash simples (para UX); hash definitivo no PDF
  const previewHash = `preview-${contrato.id}-v${contrato.versao}`;

  const html = generateContratoHTML({
    empresa: {
      razaoSocial: cliente?.razao_social ?? "",
      cnpj: cliente?.cnpj ?? "",
    },
    usuario: {
      nome: usuario?.nome_completo ?? "",
      email: usuario?.email ?? "",
      documento: usuario?.documento ?? "",
    },
    contrato: {
      numero: contrato.numero_contrato,
      versao: contrato.versao,
      dataAceite: new Date().toLocaleString("pt-BR"),
      ip: contrato.aceite_ip ?? "preview",
      userAgent:
        contrato.aceite_user_agent ??
        req.headers.get("user-agent") ??
        "preview",
    },
    termosHtml,
    privacidadeHtml,
    hash: previewHash,
  });

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}
