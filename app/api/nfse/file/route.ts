import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// GET /api/nfse/file?ref=...&kind=danfse|xml
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const ref = url.searchParams.get("ref") ?? "";
    const kind = (url.searchParams.get("kind") ?? "danfse").toLowerCase();

    if (!ref)
      return NextResponse.json({ error: "ref is required" }, { status: 400 });

    const admin = getSupabaseAdmin();

    // detect internal caller by header
    const provided = req.headers.get("x-internal-secret") ?? null;
    const expected = process.env.INTERNAL_API_SECRET ?? null;
    const internal = expected && provided === expected;

    let clienteId: string | null = null;
    if (!internal) {
      // authenticate user session and map to cliente_id
      const supabase = await createServerSupabase();
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authData?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { data: usuarioRpcData, error: usuarioRpcErr } =
        await supabase.rpc("current_usuario_id");
      if (usuarioRpcErr)
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });

      const usuarioId = Array.isArray(usuarioRpcData)
        ? String(usuarioRpcData[0])
        : String(usuarioRpcData ?? "");
      if (!usuarioId)
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });

      const { data: usuario } = await supabase
        .from("usuarios")
        .select("cliente_id")
        .eq("id", usuarioId)
        .maybeSingle();
      clienteId = usuario?.cliente_id ?? null;
      if (!clienteId)
        return NextResponse.json(
          { error: "Cliente não encontrado" },
          { status: 403 },
        );
    }

    // fetch nfse row
    const { data: row } = await admin
      .from("nfse_emissoes")
      .select("ref, cliente_id, caminho_xml_nota_fiscal, url_danfse")
      .eq("ref", ref)
      .maybeSingle();

    if (!row)
      return NextResponse.json({ error: "NFSe not found" }, { status: 404 });

    // ownership check for non-internal callers
    if (!internal && String(row.cliente_id) !== String(clienteId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const bucket = process.env.NFSE_STORAGE_BUCKET ?? null;
    const pathField =
      kind === "xml"
        ? row.caminho_xml_nota_fiscal
        : (row.url_danfse ?? row.caminho_xml_nota_fiscal);

    if (!pathField)
      return NextResponse.json(
        { error: "file not available" },
        { status: 404 },
      );

    // if already an http(s) url, return directly
    if (typeof pathField === "string" && /^https?:\/\//.test(pathField)) {
      return NextResponse.json({ url: pathField });
    }

    if (!bucket)
      return NextResponse.json(
        { error: "NFSE_STORAGE_BUCKET not configured" },
        { status: 500 },
      );

    try {
      const { data: signed } = await admin.storage
        .from(bucket)
        .createSignedUrl(String(pathField), 60 * 60);
      return NextResponse.json({ url: signed?.signedUrl ?? null });
    } catch (e) {
      console.error("createSignedUrl failed", e);
      return NextResponse.json(
        { error: "Failed to generate signed URL" },
        { status: 500 },
      );
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "internal" },
      { status: 500 },
    );
  }
}
