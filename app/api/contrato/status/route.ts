import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Normaliza referências de PDF para extrair o caminho correto do Supabase Storage.
 * Suporta:
 * 1. URLs assinadas do Supabase (com /sign/)
 * 2. Caminhos relativos simples (clientes/xxx/contratos/yyy/v1/arquivo.pdf)
 * 3. Caminhos corrompidos (remove UUIDs no início se não corresponder ao padrão esperado)
 */
function normalizePdfReference(value: string | null): string | null {
  if (!value) return null;

  const value_trimmed = value.trim();

  // Se for URL completa (começa com http), tentar extrair o caminho
  if (value_trimmed.startsWith("http")) {
    try {
      const parsed = new URL(value_trimmed);
      const pathSegments = parsed.pathname.split("/");

      // Procura por /sign/ que indica URL assinada Supabase
      const signIndex = pathSegments.findIndex((segment) => segment === "sign");
      if (signIndex >= 0 && pathSegments.length > signIndex + 2) {
        // Remove "storage/v1/sign/contratos/" e extrai o caminho do arquivo
        const objectPath = pathSegments.slice(signIndex + 2).join("/");
        return decodeURIComponent(objectPath);
      }

      // Se não tiver /sign/, tenta extrair de forma genérica
      // Procura por onde começa "contratos/"
      const contratoIndex = pathSegments.findIndex((p) => p === "contratos");
      if (contratoIndex > 0) {
        return pathSegments.slice(contratoIndex).join("/");
      }

      return value_trimmed;
    } catch (e) {
      console.error("[normalizePdfReference] Erro ao parsear URL:", {
        value: value_trimmed,
        error: e instanceof Error ? e.message : String(e),
      });
      return value_trimmed;
    }
  }

  // Se for caminho relativo e começar com UUID corrompido, tentar recuperar
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  if (uuidPattern.test(value_trimmed)) {
    console.warn("[normalizePdfReference] Caminho com UUID detectado:", {
      original: value_trimmed,
      msg: "Caminho pode estar corrompido. Esperado: clientes/{id}/contratos/...",
    });

    const parts = value_trimmed.split("/");
    const contratoIndex = parts.findIndex((p) => p === "contratos");
    if (contratoIndex > 0) {
      const recovered = [
        "clientes",
        parts[0],
        ...parts.slice(contratoIndex),
      ].join("/");
      console.warn("[normalizePdfReference] Caminho recuperado:", {
        recovered,
      });
      return recovered;
    }
  }

  // Se for caminho relativo normal, apenas retorna
  // Formato esperado: clientes/{cliente_id}/contratos/{contrato_id}/v{versao}/arquivo.pdf
  if (value_trimmed.includes("contratos/")) {
    return value_trimmed;
  }

  return value_trimmed;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const contratoId = searchParams.get("contratoId") || "";

    if (!contratoId || contratoId.length !== 36) {
      return NextResponse.json(
        { contrato: null, pagamento: null },
        { status: 200 },
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    const { data: contrato, error } = await supabase
      .from("contratos")
      .select(
        `
        id,
        cliente_id,
        numero_contrato,
        versao,
        status,
        tipo_contrato,
        criado_em,
        atualizado_em,
        pdf_url,
        pdf_assinado_url,
        forma_pagamento,
        pagarme_order_id,
        pagarme_payment_status
      `,
      )
      .eq("id", contratoId)
      .maybeSingle();

    // ✅ NÃO QUEBRAR
    if (error || !contrato) {
      console.error("Erro contrato:", error);
      return NextResponse.json({
        contrato: null,
        pagamento: null,
      });
    }

    const contratoSanitizado = {
      ...contrato,
      pdf_url: normalizePdfReference(contrato.pdf_url),
      pdf_assinado_url: normalizePdfReference(contrato.pdf_assinado_url),
    };

    const pagamento = contrato.pagarme_order_id
      ? {
          order_id: contrato.pagarme_order_id,
          status: contrato.pagarme_payment_status ?? "unknown",
          amount: null,
          method: contrato.forma_pagamento ?? null,
        }
      : null;

    return NextResponse.json({ contrato: contratoSanitizado, pagamento });
  } catch (err) {
    console.error("Erro geral:", err);

    return NextResponse.json({
      contrato: null,
      pagamento: null,
    });
  }
}
