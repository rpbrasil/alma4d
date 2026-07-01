import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { gerarContratoPdfInterno } from "@/lib/contrato-pdf";

type RetentarBody = {
  contratoId?: string;
};

export async function POST(req: Request) {
  const supabase = getSupabaseAdmin();

  // Auth via session cookie
  const supa = await createServerSupabase();
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  // Resolve caller's usuario_id → cliente_id
  const { data: usuarioId } = await supa.rpc("current_usuario_id");
  if (!usuarioId) {
    return NextResponse.json(
      { error: "Usuário não identificado" },
      { status: 401 },
    );
  }
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("cliente_id, role")
    .eq("id", usuarioId)
    .maybeSingle();
  if (!usuario?.cliente_id) {
    return NextResponse.json({ error: "Perfil incompleto" }, { status: 403 });
  }

  // Parse body
  let body: RetentarBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }
  const { contratoId } = body;
  if (!contratoId) {
    return NextResponse.json(
      { error: "contratoId obrigatório" },
      { status: 400 },
    );
  }

  // Fetch contract and verify ownership
  const { data: contrato } = await supabase
    .from("contratos")
    .select("id, cliente_id, status, pdf_status, pagarme_payment_status")
    .eq("id", contratoId)
    .maybeSingle();

  if (!contrato) {
    return NextResponse.json(
      { error: "Contrato não encontrado" },
      { status: 404 },
    );
  }

  const isAdmin = usuario.role === "admin";
  if (!isAdmin && contrato.cliente_id !== usuario.cliente_id) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  // Only retry when payment is confirmed
  if (contrato.pagarme_payment_status !== "paid") {
    return NextResponse.json(
      {
        error: "Pagamento ainda não confirmado",
        pdf_status: contrato.pdf_status,
      },
      { status: 422 },
    );
  }

  // Always regenerate — caller explicitly requested it
  // Reset to pending unconditionally — explicit call = force regeneration
  await supabase
    .from("contratos")
    .update({ pdf_status: "pending", pdf_error: null, pdf_url: null })
    .eq("id", contratoId);

  try {
    const result = (await gerarContratoPdfInterno({
      supabase,
      contratoId,
    })) as {
      ok?: boolean;
      pdf_url?: string;
    };

    // Persist success
    await supabase
      .from("contratos")
      .update({
        pdf_status: "done",
        pdf_generated_at: new Date().toISOString(),
        pdf_error: null,
        pdf_url: result.pdf_url ?? null,
      })
      .eq("id", contratoId);

    return NextResponse.json({ ok: true, pdf_url: result.pdf_url ?? null });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    await supabase
      .from("contratos")
      .update({ pdf_status: "error", pdf_error: msg })
      .eq("id", contratoId);

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
