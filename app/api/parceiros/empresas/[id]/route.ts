import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = req.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Token ausente" }, { status: 401 });
    }

    const token = auth.split(" ")[1];

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    const { data: userWrap, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !userWrap?.user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const callerId = userWrap.user.id;
    const { data: perfil, error: perfilErr } = await supabaseAdmin
      .from("usuarios")
      .select("id, role")
      .eq("id", callerId)
      .maybeSingle();

    if (perfilErr || !perfil || perfil.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const body = await req.json();
    const updates: any = {};
    if (body.parceiro_id !== undefined) updates.parceiro_id = body.parceiro_id;
    if (body.cnpj !== undefined) updates.cnpj = (body.cnpj || "").replace(/\D/g, "");
    if (body.percentual !== undefined) updates.percentual = Number(body.percentual);
    if (body.nome !== undefined) updates.nome = body.nome;
    if (body.ativo !== undefined) updates.ativo = body.ativo;

    const { data, error } = await supabaseAdmin
      .from("parceiros_empresas_elegiveis")
      .update(updates)
      .eq("id", params.id)
      .select()
      .maybeSingle();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, empresa: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = req.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Token ausente" }, { status: 401 });
    }

    const token = auth.split(" ")[1];

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
+    );
+
+    const { data: userWrap, error: authErr } = await supabaseAdmin.auth.getUser(token);
+    if (authErr || !userWrap?.user) {
+      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
+    }
+
+    const callerId = userWrap.user.id;
+    const { data: perfil, error: perfilErr } = await supabaseAdmin
+      .from("usuarios")
+      .select("id, role")
+      .eq("id", callerId)
+      .maybeSingle();
+
+    if (perfilErr || !perfil || perfil.role !== "admin") {
+      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
+    }
+
+    const { error } = await supabaseAdmin.from("parceiros_empresas_elegiveis").delete().eq("id", params.id);
+    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
+
+    return NextResponse.json({ ok: true });
+  } catch (e: unknown) {
+    const msg = e instanceof Error ? e.message : "Erro interno";
+    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
+  }
+}
+
