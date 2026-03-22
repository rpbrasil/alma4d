import { NextResponse } from "next/server";

type PaymentMethod = "credit_card" | "pix" | "boleto";

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
    accepted_payment_methods: PaymentMethod[];
    statement_descriptor?: string;
    credit_card_settings?: {
      operation_type: "auth_and_capture" | "auth_only";
      delay_to_capture?: number;
      installments?: Array<{ number: number; total: number }>;
      installments_setup?: {
        max_installments?: number;
        amount?: number;
        interest_type?: "simple";
        interest_rate?: number;
        customer_fee?: boolean;
        free_installments?: number;
        brand?: string;
      };
    };
    pix_settings?: {
      expires_in?: number;
      expires_at?: string;
      discount?: number;
      discount_percentage?: number;
      additiona_information?: Record<string, string>;
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

export async function POST(req: Request) {
  try {
    const bodyUnknown: unknown = await req.json();
    if (!bodyUnknown || typeof bodyUnknown !== "object") {
      return NextResponse.json(
        { ok: false, error: "Body inválido." },
        { status: 400 },
      );
    }

    const body = bodyUnknown as Partial<CheckoutLinkBody>;

    const apiKey = process.env.PAGARME_API_KEY;
    if (!apiKey) {
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

    if (!userId)
      return NextResponse.json(
        { ok: false, error: "userId é obrigatório." },
        { status: 400 },
      );
    if (!name)
      return NextResponse.json(
        { ok: false, error: "nome_completo é obrigatório." },
        { status: 400 },
      );
    if (!cpf)
      return NextResponse.json(
        { ok: false, error: "CPF é obrigatório." },
        { status: 400 },
      );
    if (!isValidCPF(cpf))
      return NextResponse.json(
        { ok: false, error: "CPF inválido." },
        { status: 400 },
      );

    const isTestKey = apiKey.startsWith("sk_test");
    const endpoint = isTestKey
      ? "https://sdx-api.pagar.me/core/v5/paymentlinks"
      : "https://api.pagar.me/core/v5/paymentlinks";

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
          installments_setup: { max_installments: 1 },
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

    const auth = Buffer.from(`${apiKey}:`).toString("base64");

    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(payload),
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
      return NextResponse.json(
        { ok: false, error: "Resposta do Pagar.me sem 'url'.", details: data },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, url: okObj.url });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro inesperado.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
