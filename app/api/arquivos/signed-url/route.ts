import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { path } = await req.json();

    if (!path) {
      return NextResponse.json({ error: "path obrigatorio" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // ✅ precisa ser service role
    );

    const { data, error } = await supabase.storage
      .from("denuncias")
      .createSignedUrl(path, 60); // 60 segundos

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      url: data.signedUrl,
    });
  } catch {
    return NextResponse.json({ error: "erro inesperado" }, { status: 500 });
  }
}
