import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function nowISO() {
  return new Date().toISOString();
}

function getString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export async function POST(req: Request) {
  try {
    /* ===================== SEGURANÇA ===================== */

    const expected = process.env.FOCUS_WEBHOOK_SECRET ?? "";
    const received = req.headers.get("authorization") ?? "";
    console.log("FOCUS WEBHOOK - Received secret:", received); // ✅ log do segredo recebido
    if (!expected || received !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* ===================== PAYLOAD ===================== */

    const payload = await req.json();

    // ✅ CORREÇÃO: usar payload real da Focus
    const ref = getString(payload.ref) ?? null;
    const status = getString(payload.status)?.toLowerCase() ?? null;

    if (!ref || !status) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    /* ===================== SUPABASE ===================== */

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    /* ===================== ATUALIZA NFSE ===================== */

    await supabase
      .from("nfse_emissoes")
      .update({
        status,
        resposta: payload, // ✅ salva payload completo da Focus
        updated_at: nowISO(),
      })
      .eq("ref", ref);

    /* ===================== ENVIO EMAIL ===================== */

    if (status === "autorizado") {
      const { data: nfse } = await supabase
        .from("nfse_emissoes")
        .select("email_enviado")
        .eq("ref", ref)
        .maybeSingle();

      if (!nfse?.email_enviado) {
        try {
          const baseUrl = process.env.BASE_URL;

          if (!baseUrl) {
            console.error("BASE_URL ausente");
          } else {
            // ✅ chama seu endpoint já pronto
            const res = await fetch(
              `${baseUrl}/api/nfse/email/${encodeURIComponent(ref)}/email`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tipo: "auto" }),
              },
            );

            if (!res.ok) {
              console.error("Erro ao chamar endpoint de envio NFSe");
            } else {
              // ✅ só marca como enviado SE realmente enviou
              await supabase
                .from("nfse_emissoes")
                .update({ email_enviado: true })
                .eq("ref", ref);
            }
          }
        } catch (err) {
          console.error("Erro ao enviar email NFSe:", err);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Webhook Focus erro:", err);

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno" },
      { status: 500 },
    );
  }
}
