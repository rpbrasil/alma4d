import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

type Body = {
  contratoId: string;
  campaign?: string;
};

function normalizeBaseUrl(raw: string) {
  return raw.replace(/\/+$/, "");
}

export async function POST(req: Request) {
  // Next 15/16: cookies() e headers() são async → precisam de await [1](https://onedrive.live.com/personal/97449981f113131d/_layouts/15/doc.aspx?resid=22027e74-949b-48bf-ba71-491157e03c00&cid=97449981f113131d)[2](https://www.npmjs.com/package/react-qr-code)
  const cookieStore = await cookies();
  const headerStore = await headers();

  // Auth via cookies (SSR)
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),

        setAll: () => {
          // noop (não precisamos setar cookies aqui)
        },
      },
    },
  );

  const {
    data: { user },
    error: userErr,
  } = await supabaseAuth.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }
  console.log(
    "SERVICE_ROLE:",
    process.env.SUPABASE_SERVICE_ROLE_KEY ? "OK" : "MISSING",
  );

  // Usuário ativo
  const { data: profile, error: profErr } = await supabaseAuth
    .from("usuarios")
    .select("ativo")
    .eq("id", user.id)
    .single();

  if (profErr) {
    return NextResponse.json({ error: profErr.message }, { status: 500 });
  }
  if (profile?.ativo === false) {
    return NextResponse.json({ error: "inactive_user" }, { status: 403 });
  }

  // Body
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "json_invalido" }, { status: 400 });
  }

  const contratoId = String(body.contratoId ?? "").trim();
  if (!contratoId) {
    return NextResponse.json(
      { error: "contratoId_obrigatorio" },
      { status: 400 },
    );
  }
  console.log("BODY:", body);
  console.log("contratoId:", contratoId);

  // Admin client (server-only)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // 1) Validar contrato + limite_usuarios + cliente_id
  const { data: contrato, error: contratoErr } = await supabaseAdmin
    .from("contratos")
    .select("id, cliente_id, status, limite_usuarios")
    .eq("id", contratoId)
    .single();

  if (contratoErr || !contrato) {
    return NextResponse.json(
      { error: "contrato_nao_encontrado" },
      { status: 404 },
    );
  }

  if (String(contrato.status).toLowerCase() !== "ativo") {
    return NextResponse.json({ error: "contrato_inativo" }, { status: 403 });
  }

  const limiteUsuarios =
    typeof contrato.limite_usuarios === "number"
      ? contrato.limite_usuarios
      : null;

  if (!limiteUsuarios || limiteUsuarios <= 0) {
    return NextResponse.json(
      { error: "contrato_sem_limite_usuarios" },
      { status: 403 },
    );
  }

  // 2) Validar cliente ativo
  const { data: cliente, error: clienteErr } = await supabaseAdmin
    .from("clientes")
    .select("ativo")
    .eq("id", contrato.cliente_id)
    .single();

  if (clienteErr || !cliente) {
    return NextResponse.json(
      { error: "cliente_nao_encontrado" },
      { status: 404 },
    );
  }

  if (cliente.ativo === false) {
    return NextResponse.json({ error: "cliente_inativo" }, { status: 403 });
  }

  // 3) Buscar link ativo existente (idempotente)
  const { data: existing, error: exErr } = await supabaseAdmin
    .from("copsoq_links")
    .select("id, contrato_id, max_respostas, usadas, ativo, created_at")
    .eq("contrato_id", contratoId)
    .eq("ativo", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (exErr) {
    return NextResponse.json({ error: exErr.message }, { status: 500 });
  }

  let link = existing;

  // 4) Criar se não existir
  if (!link) {
    const { data: created, error: crErr } = await supabaseAdmin
      .from("copsoq_links")
      .insert({
        contrato_id: contratoId,
        max_respostas: limiteUsuarios, // ✅ vem do contrato
        usadas: 0,
        ativo: true,
        created_by: user.id,
      })
      .select("id, contrato_id, max_respostas, usadas, ativo, created_at")
      .single();

    if (crErr) {
      // fallback caso exista unique index e role concorrência
      const { data: reFetched, error: rfErr } = await supabaseAdmin
        .from("copsoq_links")
        .select("id, contrato_id, max_respostas, usadas, ativo, created_at")
        .eq("contrato_id", contratoId)
        .eq("ativo", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (rfErr || !reFetched) {
        return NextResponse.json({ error: crErr.message }, { status: 500 });
      }
      link = reFetched;
    } else {
      link = created;
    }
  }

  // 5) Montar URL definitiva
  const envBase = process.env.NEXT_PUBLIC_APP_URL;
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  const host =
    headerStore.get("x-forwarded-host") ??
    headerStore.get("host") ??
    new URL(req.url).host;

  const baseUrl = normalizeBaseUrl(envBase ? envBase : `${proto}://${host}`);

  const url = new URL("/express/copsoq", baseUrl);
  url.searchParams.set("linkId", link.id);

  const campaign = (body.campaign ?? "").trim();
  if (campaign) url.searchParams.set("c", campaign);

  // ✅ Resposta padronizada em camelCase (evita bug de maxRespostas no front)
  return NextResponse.json({
    ok: true,
    linkId: link.id,
    contratoId: link.contrato_id,
    maxRespostas: Number(link.max_respostas ?? 0),
    usadas: Number(link.usadas ?? 0),
    url: url.toString(),
  });
}
