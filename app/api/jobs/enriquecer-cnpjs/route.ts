import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = getSupabaseAdmin();

  // ✅ 1. buscar empresas sem nome
  const { data: empresas } = await supabase
    .from("parceiros_empresas_elegiveis")
    .select("id, cnpj")
    .is("razao_social", null)
    .limit(20); // ✅ LOTE PEQUENO

  if (!empresas?.length) {
    return NextResponse.json({ ok: true, message: "Nada para enriquecer" });
  }

  const focusToken = process.env.FOCUS_NFE_TOKEN;

  for (const emp of empresas) {
    try {
      // ✅ 2. consulta API
      const auth = Buffer.from(`${focusToken}:`).toString("base64");

      const res = await fetch(
        `https://api.focusnfe.com.br/v2/cnpjs/${emp.cnpj}`,
        {
          headers: { Authorization: `Basic ${auth}` },
        },
      );

      if (!res.ok) continue;

      const data = await res.json();

      const razao = data.razao_social ?? null;

      if (!razao) continue;

      // ✅ 3. salva cache
      await supabase.from("cnpj_consultas").upsert(
        {
          cnpj: emp.cnpj,
          razao_social: razao,
          raw: data,
        },
        { onConflict: "cnpj" },
      );

      // ✅ 4. atualiza empresa
      await supabase
        .from("parceiros_empresas_elegiveis")
        .update({
          razao_social: razao,
        })
        .eq("id", emp.id);
    } catch (err) {
      console.error("Erro ao enriquecer:", emp.cnpj, err);
    }
  }

  return NextResponse.json({
    ok: true,
    processados: empresas.length,
  });
}
