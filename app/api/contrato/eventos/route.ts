import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const contratoId = searchParams.get("contratoId");

  if (!contratoId) {
    return NextResponse.json(
      { error: "contratoId obrigatório" },
      { status: 400 },
    );
  }

  if (!contratoId) {
    return NextResponse.json(
      { error: "contratoId obrigatório" },
      { status: 400 },
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const { data, error } = await supabase
    .from("contrato_eventos")
    .select("id, tipo, dados, created_at")
    .eq("contrato_id", contratoId)
    .order("created_at", { ascending: true });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ eventos: data ?? [] });
}
