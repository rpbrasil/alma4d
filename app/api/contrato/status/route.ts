import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function normalizePdfReference(value: string | null): string | null {
  if (!value) return null;

  try {
    const parsed = new URL(value);
    const pathSegments = parsed.pathname.split("/");
    const signIndex = pathSegments.findIndex((segment) => segment === "sign");

    if (signIndex >= 0 && pathSegments.length > signIndex + 2) {
      const objectPath = pathSegments.slice(signIndex + 2).join("/");
      return decodeURIComponent(objectPath);
    }

    return value;
  } catch {
    return value;
  }
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
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!,
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
