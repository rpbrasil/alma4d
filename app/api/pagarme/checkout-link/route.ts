import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type PagarmePhone = {
  country_code: string;
  area_code: string;
  number: string;
};

type PagarmeCustomer = {
  name: string;
  type?: "individual" | "company";
  email?: string;
  code?: string;
  document?: string;
  document_type?: "CPF" | "CNPJ" | "PASSPORT";
  phones?: { home_phone?: PagarmePhone; mobile_phone?: PagarmePhone };
  birthdate?: string;
  metadata?: Record<string, unknown>;
};

type PaymentLinkRequest = {
  is_building?: boolean;
  name: string;
  order_code?: string;
  type: "order" | "subscription";
  payment_settings: {
    accepted_payment_methods: ["credit_card", "pix"];
    statement_descriptor: "ALMA4D";
    credit_card_settings: {
      operation_type: "auth_and_capture";
      installments: [
        { number: 1; total: 15000 },
        { number: 2; total: 15000 },
        { number: 3; total: 15000 },
        { number: 4; total: 15000 },
        { number: 5; total: 15000 },
      ];
    };
    pix_settings: {
      expires_in: 1800;
    };
  };
  customer_settings?: {
    customer_id?: string;
    customer?: PagarmeCustomer;
  };
  cart_settings: {
    shipping_cost?: number;
    items: Array<{ amount: number; name: string; default_quantity: number }>;
  };
  layout_settings?: Record<string, unknown>;
};

type PaymentLinkResponseOk = {
  id: string;
  url: string;
  status: string;
  type: "order" | "subscription";
};

type PaymentLinkResponseError = {
  message?: string;
  error?: string;
};

type CheckoutLinkBody = {
  userId: string;
  nome_completo: string | null;
  email: string | null;
  telefone: string | null;
  documento: string | null;
  origem: string | null;
  campanha: string | null;
  tipo_plano: string | null;
};

/* ===================== helpers ===================== */

function onlyDigits(v: string) {
  return v.replace(/\D/g, "");
}

function isValidCPF(input: string) {
  const cpf = onlyDigits(input);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;

  const calc = (base: string, factor: number) => {
    let sum = 0;
    for (let i = 0; i < base.length; i++) sum += Number(base[i]) * (factor - i);
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };

  const d1 = calc(cpf.slice(0, 9), 10);
  const d2 = calc(cpf.slice(0, 10), 11);
  return d1 === Number(cpf[9]) && d2 === Number(cpf[10]);
}

function parseMobileBR(e164: string | null) {
  const digits = onlyDigits(e164 ?? "");
  if (!digits.startsWith("55")) return null;
  if (digits.length < 12) return null;

  return {
    country_code: "55",
    area_code: digits.slice(2, 4),
    number: digits.slice(4),
  } satisfies PagarmePhone;
}

function mask(value: string | null | undefined, visible = 3) {
  if (!value) return value;
  if (value.length <= visible * 2) return "***";
  return value.slice(0, visible) + "***" + value.slice(value.length - visible);
}

function log(
  level: "info" | "warn" | "error",
  requestId: string,
  message: string,
  data?: unknown,
) {
  const prefix = `[checkout-link:${requestId}]`;
  if (data !== undefined) {
    console[level](`${prefix} ${message}`, data);
  } else {
    console[level](`${prefix} ${message}`);
  }
}

/* ===================== handler ===================== */

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  log("info", requestId, "request started");

  try {
    const bodyUnknown: unknown = await req.json();
    if (!bodyUnknown || typeof bodyUnknown !== "object") {
      log("warn", requestId, "invalid body");
      return NextResponse.json(
        { ok: false, error: "Body inválido." },
        { status: 400 },
      );
    }

    const body = bodyUnknown as Partial<CheckoutLinkBody>;

    log("info", requestId, "body received", {
      userId: body.userId,
      origem: body.origem,
      campanha: body.campanha,
    });

    const apiKey = process.env.PAGARME_API_KEY;
    if (!apiKey) {
      log("error", requestId, "missing PAGARME_API_KEY");
      return NextResponse.json(
        { ok: false, error: "PAGARME_SECRET_KEY ausente." },
        { status: 500 },
      );
    }

    const userId = String(body.userId ?? "").trim();
    const name = String(body.nome_completo ?? "").trim();
    const email = body.email ? String(body.email).trim() : "";
    const telefone = body.telefone ? String(body.telefone).trim() : null;
    const cpf = onlyDigits(String(body.documento ?? ""));

    if (!userId) {
      log("warn", requestId, "missing userId");
      return NextResponse.json(
        { ok: false, error: "userId é obrigatório." },
        { status: 400 },
      );
    }

    if (!name) {
      log("warn", requestId, "missing nome_completo", { userId });
      return NextResponse.json(
        { ok: false, error: "nome_completo é obrigatório." },
        { status: 400 },
      );
    }

    if (!cpf) {
      log("warn", requestId, "missing CPF", { userId });
      return NextResponse.json(
        { ok: false, error: "CPF é obrigatório." },
        { status: 400 },
      );
    }

    if (!isValidCPF(cpf)) {
      log("warn", requestId, "invalid CPF", {
        userId,
        cpf: mask(cpf),
      });
      return NextResponse.json(
        { ok: false, error: "CPF inválido." },
        { status: 400 },
      );
    }

    log("info", requestId, "validation passed", {
      userId,
      email: mask(email),
      telefone: mask(telefone),
      cpf: mask(cpf),
    });

    const isTestKey = apiKey.startsWith("sk_test");
    const endpoint = isTestKey
      ? "https://sdx-api.pagar.me/core/v5/paymentlinks"
      : "https://api.pagar.me/core/v5/paymentlinks";

    log("info", requestId, "using endpoint", {
      env: isTestKey ? "test" : "production",
      endpoint,
    });

    const mobile = parseMobileBR(telefone);

    const payload: PaymentLinkRequest = {
      is_building: false,
      name: "alma4D Premium",
      order_code: `USR_${userId}`,
      type: "order",
      payment_settings: {
        accepted_payment_methods: ["credit_card", "pix"],
        statement_descriptor: "ALMA4D",
        credit_card_settings: {
          operation_type: "auth_and_capture",
          installments: [
            { number: 1, total: 15000 },
            { number: 2, total: 15000 },
            { number: 3, total: 15000 },
            { number: 4, total: 15000 },
            { number: 5, total: 15000 },
          ],
        },
        pix_settings: {
          expires_in: 1800,
        },
      },
      cart_settings: {
        shipping_cost: 0,
        items: [
          { name: "Plano Premium alma4D", amount: 15000, default_quantity: 1 },
        ],
      },
      customer_settings: {
        customer: {
          name: name.slice(0, 64),
          email: email ? email.slice(0, 64) : undefined,
          type: "individual",
          document: cpf,
          document_type: "CPF",
          ...(mobile ? { phones: { mobile_phone: mobile } } : {}),
          metadata: {
            userId,
            origem: body.origem ?? null,
            campanha: body.campanha ?? null,
            tipo_plano: body.tipo_plano ?? null,
          },
        },
      },
    };

    log("info", requestId, "payload prepared", {
      order_code: payload.order_code,
      payment_methods: payload.payment_settings.accepted_payment_methods,
      amount: payload.cart_settings.items[0].amount,
    });

    const auth = Buffer.from(`${apiKey}:`).toString("base64");

    const orderCode = `USR_${userId}`;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { error: insertErr } = await supabase.from("payment_links").insert({
      user_id: userId,
      order_id: orderCode,
      status: "pending",
      amount: payload.cart_settings.items[0].amount,
      payment_method:
        payload.payment_settings.accepted_payment_methods.join(","),
      product_name: payload.cart_settings.items[0].name,
    });

    if (insertErr) {
      // erro interno sério → logar
      await supabase.from("logs").insert({
        source: "checkout-link",
        level: "error",
        user_id: userId,
        message: {
          stage: "create_payment_links_row",
          error: insertErr.message,
        },
        metadata: { order_id: orderCode },
      });

      return NextResponse.json(
        { ok: false, error: "Erro interno ao iniciar pagamento." },
        { status: 500 },
      );
    }

    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(payload),
    });

    log("info", requestId, "pagarme response", {
      status: resp.status,
      ok: resp.ok,
    });

    const raw = await resp.text();
    let data: unknown = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = { error: "Resposta não-JSON", raw };
    }

    if (!resp.ok) {
      const errObj =
        data && typeof data === "object"
          ? (data as PaymentLinkResponseError)
          : {};

      log("error", requestId, "pagarme error", {
        status: resp.status,
        error: errObj.message ?? errObj.error,
        details: data,
      });
      await supabase
        .from("payment_links")
        .update({
          status: "error",
          last_event: "pagarme_create_failed",
          updated_at: new Date().toISOString(),
        })
        .eq("order_id", orderCode);

      // log relevante (1 linha, sem ruído)
      await supabase.from("logs").insert({
        source: "checkout-link",
        level: "error",
        user_id: userId,
        message: {
          stage: "pagarme_create_link",
          error: errObj.message ?? errObj.error ?? "unknown",
        },
        metadata: {
          order_id: orderCode,
          pagarme_status: resp.status,
        },
      });
      return NextResponse.json(
        {
          ok: false,
          error: errObj.message ?? errObj.error ?? "Erro ao criar link.",
          details: data,
        },
        { status: resp.status },
      );
    }

    const okObj = data as Partial<PaymentLinkResponseOk>;
    if (!okObj.url) {
      log("error", requestId, "missing url in pagarme response", data);
      return NextResponse.json(
        { ok: false, error: "Resposta do Pagar.me sem 'url'.", details: data },
        { status: 500 },
      );
    }

    log("info", requestId, "checkout link created", {
      url: okObj.url,
    });
    await supabase
      .from("payment_links")
      .update({
        payment_link_id: okObj.id,
        payment_link_url: okObj.url,
        status: "created",
        last_event: "checkout_link_created",
        updated_at: new Date().toISOString(),
      })
      .eq("order_id", orderCode);
    return NextResponse.json({ ok: true, url: okObj.url });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro inesperado.";
    log("error", requestId, "unexpected error", { msg });
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  } finally {
    log("info", requestId, "request finished");
  }
}
