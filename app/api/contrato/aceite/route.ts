import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { contratoId, versao_termos = 1 } = body;

    if (!contratoId) {
      return NextResponse.json(
        { error: "contratoId é obrigatório" },
        { status: 400 },
      );
    }

    // ✅ SUPABASE
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // ✅ BUSCA CONTRATO (validação)
    const { data: contrato, error: contratoError } = await supabase
      .from("contratos")
      .select("id, status, aceite_termos")
      .eq("id", contratoId)
      .single();

    if (contratoError || !contrato) {
      return NextResponse.json(
        { error: "Contrato não encontrado" },
        { status: 404 },
      );
    }

    // ✅ evita aceite duplicado
    if (contrato.aceite_termos) {
      return NextResponse.json({
        ok: true,
        message: "Contrato já aceito anteriormente",
      });
    }

    // ✅ captura IP real
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0] ||
      req.headers.get("x-real-ip") ||
      "0.0.0.0";

    // ✅ user agent
    const userAgent = req.headers.get("user-agent") || "unknown";

    // ✅ snapshot (MELHORAR DEPOIS com HTML real)
    const termosHtmlSnapshot = null;

    // ✅ UPDATE COM GUARDA DE ESTADO
    const { error: updateError } = await supabase
      .from("contratos")
      .update({
        aceite_termos: true,
        aceite_termos_em: new Date().toISOString(),
        aceite_ip: ip,
        aceite_user_agent: userAgent,
        versao_termos,
        termos_html: termosHtmlSnapshot,
        status: "aceito",
      })
      .eq("id", contratoId)
      .eq("aceite_termos", false); // 🔥 evita race condition

    if (updateError) {
      console.error("Erro ao salvar aceite:", updateError);
      return NextResponse.json(
        { error: "Erro ao registrar aceite" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      contratoId,
      status: "aceito",
    });
  } catch (err) {
    console.error("Erro inesperado:", err);

    return NextResponse.json(
      { error: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}
