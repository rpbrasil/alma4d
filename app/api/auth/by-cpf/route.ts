// /api/auth/by-cpf/route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function onlyDigits(v: string) {
  return (v ?? "").replace(/\D/g, "");
}

function maskPhone(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.length < 10) return phone;

  return `(${d.slice(2, 4)}) ••••-${d.slice(-4)}`;
}

export async function POST(req: Request) {
  try {
    const { cpf } = await req.json();

    const cpfDigits = onlyDigits(cpf);

    if (cpfDigits.length !== 11) {
      return NextResponse.json({ error: "CPF inválido" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("usuarios")
      .select("telefone")
      .eq("documento", cpfDigits)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: "Erro ao buscar usuário" },
        { status: 500 },
      );
    }

    if (!data?.telefone) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      found: true,
      telefone: data.telefone,
      telefone_mask: maskPhone(data.telefone),
    });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
