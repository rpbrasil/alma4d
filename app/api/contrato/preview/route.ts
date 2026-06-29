import { NextResponse } from "next/server";
import { generateContratoHTML } from "@/lib/contratoTemplate";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import fs from "fs";
import path from "path";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const contratoId = searchParams.get("contratoId") || "";
  const raw = searchParams.get("raw") === "true";

  if (!contratoId) {
    return NextResponse.json(
      { error: "contratoId é obrigatório" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();

  const { data: contrato, error: contratoErr } = await supabase
    .from("contratos")
    .select(
      "id, cliente_id, criado_por, aceite_ip, aceite_user_agent, termos_html, versao, numero_contrato, versao_termos",
    )
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
    .select("nome, documento")
    .eq("id", contrato.cliente_id)
    .single();

  // Lookup direto: criado_por é um usuarios.id
  let { data: usuario } = await supabase
    .from("usuarios")
    .select("nome_completo, email, documento")
    .eq("id", contrato.criado_por)
    .maybeSingle();

  // Fallback: criado_por pode ser um auth.uid() (fluxo NR1)
  // Nesse caso, busca via tabela de identidades
  if (!usuario && contrato.criado_por) {
    const { data: identity } = await supabase
      .from("usuario_auth_identities")
      .select("usuario_id")
      .eq("auth_user_id", contrato.criado_por)
      .maybeSingle();

    if (identity?.usuario_id) {
      const { data: usuarioViaIdentity } = await supabase
        .from("usuarios")
        .select("nome_completo, email, documento")
        .eq("id", identity.usuario_id)
        .maybeSingle();
      usuario = usuarioViaIdentity;
    }
  }

  if (!cliente || !usuario) {
    console.error("[preview] dados incompletos", {
      contratoId,
      cliente_id: contrato.cliente_id,
      criado_por: contrato.criado_por,
      clienteFound: !!cliente,
      usuarioFound: !!usuario,
    });
    return NextResponse.json(
      { error: "Dados do contrato incompletos" },
      { status: 500 },
    );
  }

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
  const versaoTermos = contrato.versao_termos ?? "v1.0";
  // ✅ NOVO: modo raw retorna JSON com os snapshots usados
  if (raw) {
    return NextResponse.json({
      contratoId: contrato.id,
      versao: contrato.versao,
      versao_termos: versaoTermos,
      termosHtml,
      privacidadeHtml, // opcional (se quiser versionar também)
      previewHash,
    });
  }

  const html = generateContratoHTML({
    empresa: {
      razaoSocial: cliente?.nome ?? "",
      cnpj: cliente?.documento ?? "",
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
