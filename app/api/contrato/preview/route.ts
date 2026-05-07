import { NextResponse } from "next/server";
import { generateContratoHTML } from "@/lib/contratoTemplate";
import fs from "fs";
import path from "path";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // ✅ carregar HTML real do /public
  const termosPath = path.join(process.cwd(), "public", "legal", "terms.html");
  const privacidadePath = path.join(
    process.cwd(),
    "public",
    "legal",
    "privacy.html",
  );

  const termosHtml = fs.readFileSync(termosPath, "utf-8");
  const privacidadeHtml = fs.readFileSync(privacidadePath, "utf-8");

  const html = generateContratoHTML({
    empresa: {
      razaoSocial: searchParams.get("empresa") || "",
      cnpj: searchParams.get("cnpj") || "",
    },
    usuario: {
      nome: searchParams.get("nome") || "",
      email: searchParams.get("email") || "",
      documento: searchParams.get("cpf") || "",
    },
    contrato: {
      dataAceite: new Date().toLocaleString("pt-BR"),
      ip: "0.0.0.0",
      userAgent: req.headers.get("user-agent") || "",
    },
    termosHtml,
    privacidadeHtml,
    hash: "preview-hash",
  });

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
    },
  });
}
