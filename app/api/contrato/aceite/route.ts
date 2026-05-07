import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { contratoId, termos_html, termos_hash, versao_termos } = body;

    if (!contratoId) {
      return NextResponse.json(
        { error: "contratoId é obrigatório" },
        { status: 400 },
      );
    }

    // ✅ CAPTURA IP (produção + fallback)
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    // ✅ USER AGENT (prova adicional)
    const userAgent = req.headers.get("user-agent") || "unknown";

    // ✅ SUPABASE (service role)
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // ✅ UPDATE CONTRATO (registro jurídico)
    const { error } = await supabase
      .from("contratos")
      .update({
        aceite_termos: true,
        aceite_termos_em: new Date().toISOString(),
        aceite_ip: ip,
        aceite_user_agent: userAgent,

        termos_html,
        termos_hash,
        versao_termos,
      })
      .eq("id", contratoId);

    if (error) {
      console.error("Erro ao salvar aceite:", error);
      return NextResponse.json(
        { error: "Erro ao registrar aceite" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro inesperado" }, { status: 500 });
  }
}
