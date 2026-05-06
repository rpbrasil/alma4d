"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faQrcode,
  faLightbulb,
  faShieldHalved,
  faCircleCheck,
  faUserCheck,
  faCreditCard,
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { NR1PaymentPanel } from "../../ativacao/_components/NR1PaymentPanel";

type StepId = 1 | 2 | 3 | 4 | 5;
type StepStatus = "done" | "active" | "next";
type Step = { id: StepId; name: string; desc: string; status: StepStatus };

type Sexo = "" | "M" | "F";

type UsuarioRole = "admin" | "cliente" | "gestor" | "usuario";

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
  role?: UsuarioRole | null;
  data_inicio_plano?: string | null;
  data_expiracao_plano?: string | null;
};

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

function onlyDigits(v: string) {
  return v.replace(/\D/g, "");
}

function isValidNameLoose(v: string) {
  const s = v.trim();
  if (s.length < 2) return false;
  if (!/[A-Za-zÀ-ÿ]/.test(s)) return false;
  return /^[A-Za-zÀ-ÿ0-9 .,'&()-]{2,}$/.test(s);
}

function isValidEmailLoose(email: string) {
  const s = email.trim();
  return /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(s);
}

function isValidCPF(input: string) {
  const cpf = onlyDigits(input);

  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;

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

function formatDateBR(input: string) {
  const d = input.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

function parseDateBRtoISO(br: string): string | null {
  const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const iso = `${yyyy}-${mm}-${dd}`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : iso;
}

function calculateAge(isoDate: string): number {
  const today = new Date();
  const birth = new Date(isoDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
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
          <div className="absolute top-5 left-4 right-4 h-3px rounded-full bg-slate-200" />
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

/** ===================== Wizard principal (Step 4+) ===================== */

export default function AtivacaoWizard() {
  const searchParams = useSearchParams();
  const clienteId = searchParams.get("cliente_id") ?? "";
  const contratoId = searchParams.get("contrato_id") ?? "";
  const funcionariosParam = Number(searchParams.get("funcionarios") || "0");
  // origem/campanha continuam úteis (marketing)
  const origem = searchParams.get("origem") ?? "site";
  const campanha = searchParams.get("campanha") ?? "";

  // modal termos
  const [showTerms, setShowTerms] = useState(false);

  // ✅ Começa direto no Step 4 (perfil). OTP já ocorreu no /nr1/empresa
  const [step, setStep] = useState<StepId>(4);

  // Usuário autenticado (deve existir após OTP no public)
  const [userId, setUserId] = useState<string | null>(null);

  // Perfil
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [email, setEmail] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [sexo, setSexo] = useState<Sexo>("");
  const [documento, setDocumento] = useState("");
  const [aceitouTermos, setAceitouTermos] = useState(false);

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [isEmancipated, setIsEmancipated] = useState(false);

  // ✅ Supabase browser client (mantém sessão do OTP feito no public)
  const supabase = useMemo(() => {
    return createBrowserClient(
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
  }, []);

  // ✅ Ao montar, captura usuário autenticado (OTP já validado)
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!mounted) return;
      if (error || !data.user?.id) {
        setProfileError(
          "Sessão não encontrada. Volte e valide o telefone novamente.",
        );
        setUserId(null);
        return;
      }
      setUserId(data.user.id);
    })();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  async function saveProfileAndContinue() {
    setProfileError(null);
    setProfileLoading(true);

    try {
      if (!userId) {
        throw new Error("Sessão inválida. Refaça a validação do telefone.");
      }

      const nome = nomeCompleto.trim();
      const mail = email.trim().toLowerCase();

      if (!nome) throw new Error("Informe seu nome completo.");
      if (!mail)
        throw new Error(
          "Informe seu e-mail para continuar (obrigatório para pagamento).",
        );
      if (!aceitouTermos)
        throw new Error("Você precisa aceitar os termos para continuar.");

      // qualidade nome/email
      if (!isValidNameLoose(nome)) {
        throw new Error(
          "Informe um nome completo válido (apenas letras e caracteres comuns).",
        );
      }
      if (!isValidEmailLoose(mail)) {
        throw new Error("E-mail inválido.");
      }

      // Data nascimento (opcional)
      const isoBirth = dataNascimento ? parseDateBRtoISO(dataNascimento) : null;
      if (isoBirth) {
        const age = calculateAge(isoBirth);
        if (age < 16)
          throw new Error(
            "Você precisa ter pelo menos 16 anos para continuar.",
          );
        if (age < 18 && !isEmancipated) {
          throw new Error(
            "Menores de 18 anos precisam declarar emancipação legal para continuar.",
          );
        }
      }

      // CPF obrigatório
      const cpfDigits = onlyDigits(documento);
      if (!cpfDigits) throw new Error("Informe seu CPF para continuar.");
      if (cpfDigits.length !== 11)
        throw new Error("CPF deve conter 11 dígitos.");
      if (!isValidCPF(cpfDigits))
        throw new Error("CPF inválido. Verifique e tente novamente.");

      // ✅ Pre-check CPF duplicado (melhorado: se RLS bloquear, ignora e deixa fallback)
      const { data: cpfOwner, error: cpfErr } = await supabase
        .from("usuarios")
        .select("id")
        .eq("documento", cpfDigits)
        .maybeSingle();

      // Se a query falhar por RLS (42501), não bloqueia o fluxo.
      // O banco ainda vai garantir UNIQUE e nosso fallback trata a mensagem amigável.
      if (cpfErr) {
        const code = (cpfErr as unknown as { code?: string }).code;
        if (code && code !== "42501") {
          throw new Error(cpfErr.message);
        }
      } else {
        if (cpfOwner?.id && cpfOwner.id !== userId) {
          throw new Error(
            "Este CPF já está associado a outro usuário. Verifique se você está usando o telefone correto.",
          );
        }
      }

      // Busca usuário atual (para não resetar plano/role)
      const { data: existingUser, error: fetchErr } = await supabase
        .from("usuarios")
        .select(
          "id, role, tipo_plano, data_inicio_plano, data_expiracao_plano, telefone",
        )
        .eq("id", userId)
        .maybeSingle();

      if (fetchErr) throw new Error(fetchErr.message);

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
        if (!startToSave) startToSave = nowISO();
        if (!expToSave) expToSave = addDaysISO(7);
        if (!planToSave) planToSave = "trial";
      }

      const payload: UsuarioUpsertPayload = {
        id: userId,
        telefone: existingUser?.telefone ?? null,
        nome_completo: nome || null,
        email: mail || null,
        data_nascimento: isoBirth,
        sexo: sexo === "" ? null : sexo,
        documento: cpfDigits || null,
        aceitou_termos: true,
        premium_origem: "pagarme",

        role: roleToSave,
        tipo_plano: planToSave,
        data_inicio_plano: startToSave,
        data_expiracao_plano: expToSave,
      };

      const { error: upsertErr } = await supabase
        .from("usuarios")
        .upsert(payload, {
          onConflict: "id",
        });

      if (upsertErr) {
        const code = (upsertErr as unknown as { code?: string }).code;
        const msg = (upsertErr.message || "").toLowerCase();

        // ✅ unique violation (23505) com constraint de documento
        if (code === "23505" && msg.includes("usuarios_documento_unique")) {
          throw new Error(
            "Este CPF já está associado a outro usuário. Verifique se você está usando o telefone correto.",
          );
        }

        if (code === "23505" && msg.includes("usuarios_email_unique")) {
          throw new Error("Este e-mail já está associado a outro usuário.");
        }

        throw new Error(upsertErr.message);
      }

      setStep(5);
    } catch (e: unknown) {
      setProfileError(
        getErrorMessage(e, "Não foi possível salvar seus dados."),
      );
    } finally {
      setProfileLoading(false);
    }
  }

  // ✅ Voltar não pode mais ir para steps 1-3
  function back() {
    setProfileError(null);

    setStep((s) => {
      const nextStep = (s - 1) as number;
      if (nextStep <= 4) return 4;
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
              Ativação guiada (NR‑1)
            </div>
          </div>

          <div className="mt-5 max-w-2xl">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-brand tracking-tight">
              Complete seu cadastro para seguir ao checkout
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-600">
              Seu telefone já foi validado. Agora complete seus dados e finalize
              o processo.
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
              {/* Step 4: Perfil */}
              {step === 4 && (
                <div className="grid gap-5">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-brand">
                      Complete seu perfil
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Só pedimos o essencial agora. O restante você completa no
                      checkout.
                    </p>
                  </div>

                  <div className="grid gap-4">
                    <Field label="Nome completo">
                      <input
                        value={nomeCompleto}
                        onChange={(e) => setNomeCompleto(e.target.value)}
                        placeholder="Seu nome e sobrenome"
                        autoCapitalize="words"
                        autoCorrect="off"
                        autoComplete="name"
                        enterKeyHint="next"
                        className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-brand/10"
                      />
                    </Field>

                    <Field label="E-mail (obrigatório para pagamento)">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="voce@exemplo.com"
                        inputMode="email"
                        autoComplete="email"
                        enterKeyHint="next"
                        className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-brand/10"
                      />
                    </Field>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <Field label="Data de nascimento (DD/MM/AAAA)">
                        <input
                          value={dataNascimento}
                          onChange={(e) =>
                            setDataNascimento(formatDateBR(e.target.value))
                          }
                          placeholder="DD/MM/AAAA"
                          inputMode="numeric"
                          autoComplete="bday"
                          enterKeyHint="next"
                          className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-brand/10"
                        />
                      </Field>

                      {(() => {
                        const iso = parseDateBRtoISO(dataNascimento);
                        if (!iso) return null;

                        const age = calculateAge(iso);
                        if (age >= 18) return null;

                        if (age >= 16) {
                          return (
                            <label className="flex items-start gap-3 mt-2">
                              <input
                                type="checkbox"
                                checked={isEmancipated}
                                onChange={(e) =>
                                  setIsEmancipated(e.target.checked)
                                }
                                className="mt-1"
                              />
                              <span className="text-sm text-slate-700">
                                Declaro que sou{" "}
                                <strong>emancipado(a) legalmente</strong>.
                              </span>
                            </label>
                          );
                        }

                        return (
                          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700 mt-2">
                            É necessário ter pelo menos <strong>16 anos</strong>{" "}
                            para continuar.
                          </div>
                        );
                      })()}

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
                        autoComplete="off"
                        enterKeyHint="done"
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
                        disabled={profileLoading || !userId}
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

                    {!userId && (
                      <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                        Sessão não detectada. Volte para o cadastro NR‑1 e
                        valide o telefone novamente.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 5: Pagamento NR‑1 */}
              {step === 5 && userId && (
                <NR1PaymentPanel
                  userId={userId}
                  clienteId={clienteId}
                  contratoId={contratoId}
                  funcionariosInitial={funcionariosParam || 1}
                  nomeCompleto={nomeCompleto}
                  email={email}
                  documento={documento}
                  sexo={sexo}
                  dataNascimentoISO={parseDateBRtoISO(dataNascimento)}
                  // telefoneE164: se você tiver armazenado no usuarios.telefone, pode passar daqui.
                  telefoneE164={null}
                  origem={origem}
                  campanha={campanha || null}
                />
              )}

              {/* Modal termos */}
              {showTerms && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                  <div className="bg-white w-full max-w-3xl h-[85vh] rounded-xl shadow-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                      <h2 className="font-bold text-brand">Termos de Uso</h2>
                      <button
                        onClick={() => setShowTerms(false)}
                        className="text-slate-500 hover:text-slate-700 text-sm font-semibold"
                      >
                        Fechar
                      </button>
                    </div>

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
