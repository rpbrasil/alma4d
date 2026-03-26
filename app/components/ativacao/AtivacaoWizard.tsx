"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faQrcode,
  faShieldHalved,
  faCircleCheck,
  faUserCheck,
  faCreditCard,
  faMobileScreen,
  faChevronLeft,
  faChevronRight,
  faLightbulb,
} from "@fortawesome/free-solid-svg-icons";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
);

type StepId = 1 | 2 | 3 | 4 | 5;
type StepStatus = "done" | "active" | "next";
type Step = { id: StepId; name: string; desc: string; status: StepStatus };

type Sexo = "" | "M" | "F";

type UsuarioUpsertPayload = {
  id: string;
  telefone: string | null;
  nome_completo: string | null;
  email: string | null;
  data_nascimento: string | null; // YYYY-MM-DD
  sexo: "M" | "F" | null;
  documento: string | null;
  aceitou_termos: boolean;
  premium_origem: "pagarme";
  tipo_plano?: string | null;
  role?: "admin" | "cliente" | "gestor" | "usuario" | null;
  data_inicio_plano?: string | null;
  data_expiracao_plano?: string | null;
};

type UsuarioRole = "admin" | "cliente" | "gestor" | "usuario";

function isUsuarioRole(v: unknown): v is UsuarioRole {
  return v === "admin" || v === "cliente" || v === "gestor" || v === "usuario";
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getErrorMessage(e: unknown, fallback = "Ocorreu um erro."): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return fallback;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function normalizePhoneBR(input: string) {
  const raw = input.trim();
  if (!raw) return "";

  if (raw.startsWith("+")) {
    return raw.replace(/\s+/g, "");
  }

  // Se digitou só números, assume BR: +55
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? `+${digits}` : `+55${digits}`;
}

function onlyDigits(v: string) {
  return v.replace(/\D/g, "");
}

function isValidCPF(input: string) {
  const cpf = onlyDigits(input);

  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false; // evita 00000000000 etc.

  const calcCheck = (base: string, factor: number) => {
    let sum = 0;
    for (let i = 0; i < base.length; i++) sum += Number(base[i]) * (factor - i);
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };

  const d1 = calcCheck(cpf.slice(0, 9), 10);
  const d2 = calcCheck(cpf.slice(0, 10), 11);

  return d1 === Number(cpf[9]) && d2 === Number(cpf[10]);
}

function formatCPF(input: string) {
  const d = onlyDigits(input).slice(0, 11);
  // máscara simples opcional
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

function addDaysISO(days: number) {
  const now = new Date();
  const d = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

function nowISO() {
  return new Date().toISOString();
}
/** ===================== UI: Stepper compacto ===================== */

function StepperCompact({ current }: { current: StepId }) {
  const steps: Step[] = [
    {
      id: 1,
      name: "Usar",
      desc: "QR/CTA",
      status: current > 1 ? "done" : "active",
    },
    {
      id: 2,
      name: "Confirmar",
      desc: "Interesse",
      status: current === 2 ? "active" : current > 2 ? "done" : "next",
    },
    {
      id: 3,
      name: "Validar",
      desc: "Fone",
      status: current === 3 ? "active" : current > 3 ? "done" : "next",
    },
    {
      id: 4,
      name: "Completar",
      desc: "Perfil",
      status: current === 4 ? "active" : current > 4 ? "done" : "next",
    },
    {
      id: 5,
      name: "Pagar",
      desc: "Checkout",
      status: current === 5 ? "active" : "next",
    },
  ];

  const icons: Record<StepId, IconDefinition> = {
    1: faQrcode,
    2: faLightbulb,
    3: faShieldHalved,
    4: faUserCheck,
    5: faCreditCard,
  };

  const activeIndex = Math.max(
    0,
    steps.findIndex((s) => s.status === "active"),
  );
  const progressPct =
    steps.length > 1 ? (activeIndex / (steps.length - 1)) * 100 : 0;

  return (
    <section className="mt-1">
      <div className="bg-white/70 backdrop-blur rounded-2xl border border-white shadow-[0_12px_40px_rgba(3,8,112,0.06)] px-4 py-4">
        <div className="relative">
          {/* Linha base */}
          <div className="absolute top-5 left-4 right-4 h-3px rounded-full bg-slate-200" />
          {/* Linha progresso */}
          <div
            className="absolute top-5 left-4 h-3px rounded-full bg-brand transition-all duration-500"
            style={{ width: `calc(${progressPct}% * (100% - 2rem) / 100)` }}
            aria-hidden="true"
          />

          <div className="grid grid-cols-5 gap-2 relative">
            {steps.map((s) => {
              const isDone = s.status === "done";
              const isActive = s.status === "active";

              return (
                <div key={s.id} className="flex flex-col items-center gap-1">
                  <div
                    className={cx(
                      "relative w-10 h-10 rounded-xl grid place-items-center text-sm transition-all",
                      isDone && "bg-brand text-white",
                      isActive &&
                        "bg-brand-secondary text-white scale-[1.06] ring-4 ring-brand/10",
                      s.status === "next" && "bg-slate-100 text-slate-400",
                    )}
                    aria-current={isActive ? "step" : undefined}
                  >
                    <FontAwesomeIcon icon={icons[s.id]} />
                    {isDone && (
                      <span className="absolute -bottom-1 -right-1 bg-white rounded-full p-2px shadow">
                        <FontAwesomeIcon
                          icon={faCircleCheck}
                          className="text-brand-secondary"
                        />
                      </span>
                    )}
                  </div>

                  <div className="text-center leading-tight">
                    <p
                      className={cx(
                        "text-[10px] font-semibold",
                        isActive ? "text-brand" : "text-slate-500",
                      )}
                    >
                      {s.name}
                    </p>
                    <p className="text-[9px] uppercase tracking-[0.18em] text-slate-400 font-semibold">
                      {s.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-600">
            <span className="font-semibold text-brand">Etapa:</span>{" "}
            <span className="font-semibold text-brand-secondary">
              {steps[activeIndex]?.name}
            </span>{" "}
            <span className="text-slate-500">— {steps[activeIndex]?.desc}</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[11px] font-semibold text-slate-500">
            <span className="inline-flex h-2 w-2 rounded-full bg-brand-secondary" />
            Sincronização segura
          </div>
        </div>
      </div>
    </section>
  );
}

/** ===================== UI: Inputs e botões ===================== */

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {children}
      {hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "inline-flex items-center justify-center rounded-md bg-brand px-4 py-2 text-white font-semibold transition-colors",
        "hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed",
      )}
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "inline-flex items-center justify-center rounded-md border border-border bg-surface px-4 py-2 font-semibold text-slate-700 transition-colors",
        "hover:bg-surface-muted disabled:opacity-50 disabled:cursor-not-allowed",
      )}
    >
      {children}
    </button>
  );
}

/** ===================== Wizard principal ===================== */

export default function AtivacaoWizard() {
  const searchParams = useSearchParams();

  // Origem do QR/CTA (opcional)
  const origem = searchParams.get("origem") ?? "site";
  const campanha = searchParams.get("campanha") ?? "";

  //modal termos de uso
  const [showTerms, setShowTerms] = useState(false);

  // Começa na etapa 2 (vantagens) pois 1 (QR/CTA) já ocorreu.
  const [step, setStep] = useState<StepId>(2);

  // Phone OTP
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  // Usuário autenticado
  const [userId, setUserId] = useState<string | null>(null);

  // Perfil (schema usuarios — enxuto para ativação)
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [email, setEmail] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [sexo, setSexo] = useState<Sexo>("");
  const [documento, setDocumento] = useState("");
  const [aceitouTermos, setAceitouTermos] = useState(false);

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Pagamento
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const phoneRef = useRef<HTMLInputElement | null>(null);
  const otpRef = useRef<HTMLInputElement | null>(null);

  // foca o telefone ao entrar na etapa 3
  useEffect(() => {
    if (step === 3) {
      phoneRef.current?.focus();
    }
  }, [step]);

  // foca o OTP assim que enviar o código (quando aparecer o input)
  useEffect(() => {
    if (step === 3 && otpSent) {
      otpRef.current?.focus();
    }
  }, [step, otpSent]);

  async function sendOtp() {
    setOtpError(null);
    setOtpLoading(true);

    try {
      const normalized = normalizePhoneBR(phone);
      if (!isNonEmptyString(normalized))
        throw new Error("Informe um telefone válido.");
      setPhone(normalized);

      if (
        !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ) {
        throw new Error(
          "Supabase não configurado (env vars públicas ausentes).",
        );
      }

      const { error } = await supabase.auth.signInWithOtp({
        phone: normalized,
      });
      if (error) throw new Error(error.message);

      setOtpSent(true);
    } catch (e: unknown) {
      setOtpError(getErrorMessage(e, "Não foi possível enviar o código."));
    } finally {
      setOtpLoading(false);
    }
  }

  async function verifyOtp() {
    setOtpError(null);
    setOtpLoading(true);

    try {
      const normalized = normalizePhoneBR(phone);
      if (!isNonEmptyString(normalized)) throw new Error("Telefone inválido.");
      if (!isNonEmptyString(otp) || otp.trim().length < 4)
        throw new Error("Informe o código recebido.");

      const { data, error } = await supabase.auth.verifyOtp({
        phone: normalized,
        token: otp.trim(),
        type: "sms",
      });
      if (error) throw new Error(error.message);

      const newUserId = data.user?.id ?? null;
      if (!newUserId)
        throw new Error("Não foi possível obter o usuário autenticado.");

      setUserId(newUserId);
      setStep(4);
    } catch (e: unknown) {
      setOtpError(getErrorMessage(e, "Código inválido ou expirado."));
    } finally {
      setOtpLoading(false);
    }
  }

  async function saveProfileAndContinue() {
    setProfileError(null);
    setProfileLoading(true);

    try {
      if (!userId) throw new Error("Faça a validação do telefone primeiro.");
      if (!nomeCompleto.trim()) throw new Error("Informe seu nome completo.");
      if (!aceitouTermos)
        throw new Error("Você precisa aceitar os termos para continuar.");

      const cpfDigits = onlyDigits(documento);
      if (!cpfDigits) throw new Error("Informe seu CPF para continuar.");
      if (!isValidCPF(cpfDigits))
        throw new Error("CPF inválido. Verifique e tente novamente.");

      // ✅ 1) Buscar usuário atual (para não resetar trial/premium)
      const { data: existingUser, error: fetchErr } = await supabase
        .from("usuarios")
        .select(
          "id, role, tipo_plano, data_inicio_plano, data_expiracao_plano, ativo",
        )
        .eq("id", userId)
        .maybeSingle();

      if (fetchErr) {
        throw new Error(fetchErr.message);
      }

      // ✅ 2) Regra: garantir trial de 7 dias SOMENTE se necessário
      // - Se não existe usuário: cria trial com expiração de 7 dias
      // - Se existe e é trial mas expiracao é null: preenche expiração (sem resetar)
      // - Se existe e não é trial: não mexe em datas do plano
      const isNew = !existingUser;
      const existingPlan = existingUser?.tipo_plano ?? null;
      const existingExp = existingUser?.data_expiracao_plano ?? null;
      const existingStart = existingUser?.data_inicio_plano ?? null;
      const existingRoleRaw = existingUser?.role ?? null;

      let roleToSave: UsuarioRole = "usuario";
      if (isUsuarioRole(existingRoleRaw)) roleToSave = existingRoleRaw;

      let planToSave: string | null = existingPlan;
      let startToSave: string | null = existingStart
        ? new Date(existingStart).toISOString()
        : null;
      let expToSave: string | null = existingExp
        ? new Date(existingExp).toISOString()
        : null;

      if (isNew) {
        planToSave = "trial";
        startToSave = nowISO();
        expToSave = addDaysISO(7);
      } else if ((planToSave ?? "trial") === "trial") {
        // usuário existe e é trial (ou veio null)
        if (!startToSave) startToSave = nowISO();
        if (!expToSave) expToSave = addDaysISO(7);
        if (!planToSave) planToSave = "trial";
      }
      // se for premium/qualquer outro, não altera start/exp

      // ✅ 3) Upsert final
      const payload: UsuarioUpsertPayload = {
        id: userId,
        telefone: normalizePhoneBR(phone) || null,
        nome_completo: nomeCompleto.trim() || null,
        email: email.trim() || null,
        data_nascimento: dataNascimento || null,
        sexo: sexo === "" ? null : sexo,
        documento: cpfDigits || null,
        aceitou_termos: true,
        premium_origem: "pagarme",

        // ✅ garante mínimos
        role: roleToSave,
        tipo_plano: planToSave,
        data_inicio_plano: startToSave,
        data_expiracao_plano: expToSave,
      };

      const { error } = await supabase.from("usuarios").upsert(payload, {
        onConflict: "id",
      });

      if (error) throw new Error(error.message);

      setStep(5);
    } catch (e: unknown) {
      setProfileError(
        getErrorMessage(e, "Não foi possível salvar seus dados."),
      );
    } finally {
      setProfileLoading(false);
    }
  }

  async function goToPayment() {
    setPayError(null);
    setPayLoading(true);

    try {
      if (!userId) throw new Error("Sessão inválida. Refaça a validação.");

      const body = {
        user_id: userId,

        // ✅ parâmetros financeiros (batem com a Function)
        amount: 15000, // R$ 150,00
        max_installments: 5,
        free_installments: 5,
        customer_fee: false,

        // ✅ metadados
        product_id: "premium_annual",
        product_name: "BEQV Premium Anual",
        statement_descriptor: "ALMA4D",

        // ✅ contexto do wizard
        telefone: normalizePhoneBR(phone) || null,
        email: email.trim() || null,
        nome_completo: nomeCompleto.trim() || null,
        documento: onlyDigits(documento) || null,
        origem,
        campanha: campanha || null,
      };

      const res = await fetch(
        "https://smartbeqv-afbbchhbb0hgardj.brazilsouth-01.azurewebsites.net/api/createpaymentlink",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Erro ao criar link (${res.status}): ${txt}`);
      }

      const json = await res.json();

      if (!json?.link_url) {
        throw new Error("Resposta inválida do servidor de pagamento.");
      }

      // ✅ redireciona para o checkout Pagar.me
      window.location.href = json.link_url;
    } catch (e: unknown) {
      setPayError(getErrorMessage(e, "Não foi possível iniciar o pagamento."));
    } finally {
      setPayLoading(false);
    }
  }

  function back() {
    setPayError(null);
    setProfileError(null);
    setOtpError(null);

    setStep((s) => {
      const nextStep = (s - 1) as number;
      if (nextStep <= 2) return 2;
      if (nextStep >= 5) return 5;
      return nextStep as StepId;
    });
  }

  return (
    <main
      className="min-h-screen bg-[#F0F2F5] overflow-x-hidden"
      aria-label="Ativação alma4D"
    >
      {/* Header compacto */}
      <div className="bg-linear-to-b from-white/70 to-transparent">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 pb-2">
          <div className="flex items-center justify-between gap-6">
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span className="inline-flex h-2 w-2 rounded-full bg-brand-secondary" />
              Ativação guiada
            </div>
          </div>

          <div className="mt-5 max-w-2xl">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-brand tracking-tight">
              Ative seu acesso com segurança
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-600">
              Você chegou por um QR Code ou CTA. Agora entenda o valor do app,
              valide seu telefone e finalize seu cadastro para seguir ao
              checkout.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-12">
        <StepperCompact current={step} />

        <section className="mt-3 sm:mt-4 w-full max-w-3xl mx-auto">
          <div className="relative">
            <div
              className="absolute -inset-1 rounded-2rem bg-linear-to-r from-brand/15 via-white/30 to-brand-secondary/15 blur-xl"
              aria-hidden="true"
            />
            <div className="relative bg-white rounded-2rem border border-white/60 shadow-[0_25px_70px_rgba(3,8,112,0.10)] p-4 sm:p-6">
              {step === 2 && (
                <div className="grid gap-6">
                  {/* Título empolgante */}
                  <div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-brand">
                      Você tem pelo menos{" "}
                      <span className="text-brand-secondary">5 razões</span>{" "}
                      para comprar este aplicativo
                    </h2>
                    <p className="mt-2 text-sm text-slate-600">
                      Um app criado para acompanhar sua evolução com clareza,
                      segurança e inteligência.
                    </p>
                  </div>

                  {/* Lista numerada de benefícios */}
                  <ol className="grid gap-4">
                    <li className="flex gap-3">
                      <span className="grid place-items-center h-9 w-9 min-w-2.25rem aspect-square rounded-full bg-brand-secondary text-white font-extrabold text-sm shadow-md">
                        1
                      </span>
                      <p className="text-sm text-slate-700">
                        <strong>Seu companheiro de jornada.</strong> Registre
                        conquistas, acompanhe avanços e evolua passo a passo,
                        com inteligência.
                      </p>
                    </li>

                    <li className="flex gap-3">
                      <span className="grid place-items-center h-9 w-9 min-w-2.25rem aspect-square rounded-full bg-brand-secondary text-white font-extrabold text-sm shadow-md">
                        2
                      </span>
                      <p className="text-sm text-slate-700">
                        <strong>Privacidade e segurança.</strong> Seus dados são
                        criptografados e você decide o que compartilhar — e
                        quando.
                      </p>
                    </li>

                    <li className="flex gap-3">
                      <span className="grid place-items-center h-9 w-9 min-w-2.25rem aspect-square rounded-full bg-brand-secondary text-white font-extrabold text-sm shadow-md">
                        3
                      </span>
                      <p className="text-sm text-slate-700">
                        <strong>Insights inteligentes.</strong> Gráficos,
                        análises e métricas geradas para transformar registros
                        em decisões.
                      </p>
                    </li>

                    <li className="flex gap-3">
                      <span className="grid place-items-center h-9 w-9 min-w-2.25rem aspect-square rounded-full bg-brand-secondary text-white font-extrabold text-sm shadow-md">
                        4
                      </span>
                      <p className="text-sm text-slate-700">
                        <strong>Integração com profissionais.</strong>{" "}
                        Compartilhe resultados, comprove evolução e colabore com
                        quem te acompanha.
                      </p>
                    </li>

                    <li className="flex gap-3">
                      <span className="grid place-items-center h-9 w-9 min-w-2.25rem aspect-square rounded-full bg-brand-secondary text-white font-extrabold text-sm shadow-md">
                        5
                      </span>

                      <p className="text-sm text-slate-800">
                        <strong className="text-brand-secondary">
                          Preço justo.
                        </strong>{" "}
                        Um ano completo por{" "}
                        <span className="inline-flex items-center gap-1 rounded-md bg-brand px-2 py-0.5 text-white font-extrabold">
                          R$ 150
                        </span>{" "}
                        no Pix ou em até 5x parceladas no cartão.
                      </p>
                    </li>
                  </ol>

                  {/* Rodapé + CTA */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-slate-500">
                      Origem: <span className="font-semibold">{origem}</span>
                      {campanha ? (
                        <>
                          {" "}
                          • Campanha:{" "}
                          <span className="font-semibold">{campanha}</span>
                        </>
                      ) : null}
                    </span>

                    <PrimaryButton onClick={() => setStep(3)}>
                      Quero continuar
                    </PrimaryButton>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="grid gap-5">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-brand">
                      Valide seu telefone
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Enviaremos um código por SMS para confirmar seu número.
                    </p>
                  </div>

                  <div className="grid gap-4">
                    <Field label="Telefone (WhatsApp/SMS)">
                      <input
                        ref={phoneRef}
                        value={phone}
                        onChange={(e) => setPhone(onlyDigits(e.target.value))}
                        placeholder="55 11 99999 9999"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="tel"
                        enterKeyHint={!otpSent ? "send" : "next"}
                        className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-brand/10"
                      />
                    </Field>

                    {otpSent && (
                      <Field label="Código recebido (OTP)">
                        <input
                          ref={otpRef}
                          value={otp}
                          onChange={(e) =>
                            setOtp(onlyDigits(e.target.value).slice(0, 6))
                          }
                          placeholder="Digite o código"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          autoComplete="one-time-code"
                          enterKeyHint="done"
                          className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm tracking-widest outline-none focus:ring-4 focus:ring-brand/10"
                        />
                      </Field>
                    )}

                    {otpError && (
                      <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                        {otpError}
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                      <SecondaryButton onClick={back}>
                        <FontAwesomeIcon
                          icon={faChevronLeft}
                          className="mr-2"
                        />
                        Voltar
                      </SecondaryButton>

                      {!otpSent ? (
                        <PrimaryButton onClick={sendOtp} disabled={otpLoading}>
                          {otpLoading ? "Enviando..." : "Enviar código"}
                        </PrimaryButton>
                      ) : (
                        <PrimaryButton
                          onClick={verifyOtp}
                          disabled={otpLoading}
                        >
                          {otpLoading ? "Validando..." : "Validar código"}
                        </PrimaryButton>
                      )}
                    </div>

                    <p className="text-xs text-slate-500">
                      Dica: use formato internacional (E.164). Ex.:
                      +5511999999999.
                    </p>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="grid gap-5">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-brand">
                      Complete seu perfil
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Só pedimos o essencial agora. O restante você completa
                      dentro do app.
                    </p>
                  </div>

                  <div className="grid gap-4">
                    <Field label="Nome completo">
                      <input
                        value={nomeCompleto}
                        onChange={(e) => setNomeCompleto(e.target.value)}
                        placeholder="Seu nome e sobrenome"
                        className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-brand/10"
                      />
                    </Field>

                    <Field label="E-mail (opcional)">
                      <input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="voce@exemplo.com"
                        className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-brand/10"
                      />
                    </Field>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <Field label="Data de nascimento (opcional)">
                        <input
                          type="date"
                          value={dataNascimento}
                          onChange={(e) => setDataNascimento(e.target.value)}
                          className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-brand/10"
                        />
                      </Field>

                      <Field label="Sexo (opcional)">
                        <select
                          value={sexo}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === "" || v === "M" || v === "F") setSexo(v);
                          }}
                          className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-brand/10"
                        >
                          <option value="">—</option>
                          <option value="F">Feminino</option>
                          <option value="M">Masculino</option>
                        </select>
                      </Field>
                    </div>

                    <Field
                      label="CPF (obrigatório para pagamento)"
                      hint="Somente CPF. Usamos para identificação no checkout."
                    >
                      <input
                        value={documento}
                        onChange={(e) =>
                          setDocumento(formatCPF(e.target.value))
                        }
                        placeholder="000.000.000-00"
                        inputMode="numeric"
                        className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-brand/10"
                      />
                    </Field>

                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={aceitouTermos}
                        onChange={(e) => setAceitouTermos(e.target.checked)}
                        className="mt-1"
                      />

                      <span className="text-sm text-slate-700">
                        Li e aceito os{" "}
                        <button
                          type="button"
                          onClick={() => setShowTerms(true)}
                          className="font-semibold text-brand underline"
                        >
                          Termos de Uso
                        </button>
                        .
                      </span>
                    </label>

                    {profileError && (
                      <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                        {profileError}
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                      <SecondaryButton onClick={back}>
                        <FontAwesomeIcon
                          icon={faChevronLeft}
                          className="mr-2"
                        />
                        Voltar
                      </SecondaryButton>

                      <PrimaryButton
                        onClick={saveProfileAndContinue}
                        disabled={profileLoading}
                      >
                        {profileLoading
                          ? "Salvando..."
                          : "Continuar para pagamento"}
                        <FontAwesomeIcon
                          icon={faChevronRight}
                          className="ml-2"
                        />
                      </PrimaryButton>
                    </div>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="grid gap-5">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-brand">
                      Finalizar ativação
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Você está a um passo do checkout. O pagamento é processado
                      via Pagar.me.
                    </p>
                  </div>

                  <div className="rounded-xl border border-border bg-surface-muted p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 text-brand-secondary">
                        <FontAwesomeIcon icon={faMobileScreen} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">
                          Plano Premium (exemplo)
                        </p>
                        <p className="text-sm text-slate-600">
                          Acesso completo + recursos avançados. Confirmado o
                          pagamento você já terá acesso premium.
                        </p>
                      </div>
                    </div>
                  </div>

                  {payError && (
                    <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                      {payError}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                    <SecondaryButton onClick={back}>
                      <FontAwesomeIcon icon={faChevronLeft} className="mr-2" />
                      Voltar
                    </SecondaryButton>

                    <PrimaryButton
                      onClick={goToPayment}
                      disabled={payLoading || !isValidCPF(documento)}
                    >
                      {payLoading
                        ? "Abrindo checkout..."
                        : "Ir para o pagamento"}
                      <FontAwesomeIcon icon={faCreditCard} className="ml-2" />
                    </PrimaryButton>
                  </div>

                  <p className="text-xs text-slate-500">
                    Atenção: assim que confirmarmos seu pagamento você terá os serviços premium liberados.
                  </p>
                </div>
              )}

              {showTerms && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                  <div className="bg-white w-full max-w-3xl h-[85vh] rounded-xl shadow-xl overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                      <h2 className="font-bold text-brand">Termos de Uso</h2>
                      <button
                        onClick={() => setShowTerms(false)}
                        className="text-slate-500 hover:text-slate-700 text-sm font-semibold"
                      >
                        Fechar
                      </button>
                    </div>

                    {/* Conteúdo */}
                    <iframe
                      src="/termos"
                      title="Termos de Uso"
                      className="w-full h-full border-0"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <footer className="mt-8 text-center text-slate-400 text-xs font-semibold pb-6">
            alma4D • Sincronização segura • 2026
          </footer>
        </section>
      </div>
    </main>
  );
}
