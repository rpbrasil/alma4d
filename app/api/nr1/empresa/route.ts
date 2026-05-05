import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

type Payload = {
  razaoSocial: string;
  cnpj: string;
  email: string;
  telefone?: string;
  responsavel: string;
  funcionarios: number;
  aceiteLgpd: boolean;
};

export async function POST(req: Request) {
  const supabase = await createServerSupabase();

  try {
    const body = (await req.json()) as Payload;

    const {
      razaoSocial,
      cnpj,
      email,
      telefone,
      responsavel,
      funcionarios,
      aceiteLgpd,
    } = body;

    /* ================= VALIDAÇÕES SERVER ================= */

    if (!razaoSocial?.trim() || !responsavel?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: "Campos obrigatórios ausentes." },
        { status: 400 },
      );
    }

    if (!/^\d{14}$/.test(cnpj)) {
      return NextResponse.json({ error: "CNPJ inválido." }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
    }

    if (!Number.isInteger(funcionarios) || funcionarios <= 0) {
      return NextResponse.json(
        { error: "Número de funcionários inválido." },
        { status: 400 },
      );
    }

    if (!aceiteLgpd) {
      return NextResponse.json(
        { error: "Aceite LGPD obrigatório." },
        { status: 400 },
      );
    }

    /* ================= USUÁRIO LOGADO (CRIADOR) ================= */

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Usuário não autenticado." },
        { status: 401 },
      );
    }

    /* ================= INSERT CLIENTE ================= */

    const { data: cliente, error: clienteError } = await supabase
      .from("clientes")
      .insert({
        tipo: "pj",
        nome: razaoSocial.trim(),
        documento: cnpj,
        email: email.toLowerCase(),
        telefone: telefone ?? null,
        ativo: false, // ✅ regra NR‑1
      })
      .select()
      .single();

    if (clienteError) throw clienteError;

    /* ================= INSERT USUÁRIO RESPONSÁVEL ================= */

    const { error: usuarioError } = await supabase
      .from("usuarios")
      .insert({
        cliente_id: cliente.id,
        nome: responsavel.trim(),
        email: email.toLowerCase(),
        role: "cliente",
        ativo: false, // só ativa após pagamento
      })
      .select()
      .single();

    if (usuarioError) throw usuarioError;

    /* ================= INSERT CONTRATO NR‑1 ================= */

    const { data: contrato, error: contratoError } = await supabase
      .from("contratos")
      .insert({
        cliente_id: cliente.id,
        numero_contrato: `NR1-${Date.now()}`,
        tipo_contrato: "nr1_psicossocial",
        status: "rascunho",
        data_inicio: new Date().toISOString().slice(0, 10),
        criado_por: user.id, // ✅ vem da sessão
        observacoes: {
          responsavel: responsavel.trim(),
          funcionarios,
          aceite_lgpd: true,
          origem: "nr1",
        },
      })
      .select()
      .single();

    if (contratoError) throw contratoError;

    /* ================= CALCULAR ORDER_SEQ ================= */

    const { data: lastOrder } = await supabase
      .from("payment_links")
      .select("order_seq")
      .eq("user_id", user.id)
      .order("order_seq", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrderSeq = (lastOrder?.order_seq ?? 0) + 1;

    /* ================= PAYMENT LINK (PENDING) ================= */

    const { error: paymentError } = await supabase
      .from("payment_links")
      .insert({
        user_id: user.id,
        product_name: "NR‑1 – Mapeamento de Riscos Psicossociais",
        status: "pending",
        order_seq: nextOrderSeq,
      });

    if (paymentError) throw paymentError;

    return NextResponse.json({
      success: true,
      cliente_id: cliente.id,
      contrato_id: contrato.id,
    });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json(
      { error: "Erro ao processar cadastro NR‑1." },
      { status: 500 },
    );
  }
}
