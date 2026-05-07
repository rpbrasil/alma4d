"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faLightbulb,
  faCircleCheck,
  faUserCheck,
  faCreditCard,
} from "@fortawesome/free-solid-svg-icons";
import { NR1PaymentPanel } from "../../ativacao/_components/NR1PaymentPanel";

type StepConfirmacaoServicoProps = {
  onNext: () => void;
  onShowTerms: () => void;
  onShowContrato: () => void;
  funcionarios: number;
  aceitouTermos: boolean;
  setAceitouTermos: (v: boolean) => void;
  videoUrl?: string;
  imageUrl?: string;
};

type StepId = 4 | 5 | 6;
type StepStatus = "done" | "active" | "next";
type Step = { id: StepId; name: string; desc: string; status: StepStatus };

type Sexo = "" | "M" | "F";

type UsuarioRole = "admin" | "cliente" | "gestor" | "usuario";

type UsuarioUpsertPayload = {
  id: string;
  telefone: string | null;
  nome_completo: string | null;
  email: string | null;
  data_nascimento: string | null;
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
      id: 4,
      name: "Serviço",
      desc: "Termos",
      status: current === 4 ? "active" : current > 4 ? "done" : "next",
    },
    {
      id: 5,
      name: "Perfil",
      desc: "Dados",
      status: current === 5 ? "active" : current > 5 ? "done" : "next",
    },
    {
      id: 6,
      name: "Pagamento",
      desc: "Checkout",
      status: current === 6 ? "active" : "next",
    },
  ];

  const icons: Record<StepId, IconDefinition> = {
    4: faLightbulb,
    5: faUserCheck,
    6: faCreditCard,
  };

  const activeIndex = steps.findIndex((s) => s.status === "active");
  const progress = ((activeIndex + 1) / steps.length) * 100;

  return (
    <section className="mt-2">
      <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
        {/* Progress bar */}
        <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-brand transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Steps */}
        <div className="grid grid-cols-3 gap-2">
          {steps.map((s) => {
            const isActive = s.status === "active";
            const isDone = s.status === "done";

            return (
              <div
                key={s.id}
                className="flex flex-col items-center text-center gap-1"
              >
                <div
                  className={cx(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                    isDone && "bg-brand text-white",
                    isActive && "bg-brand-secondary text-white scale-105",
                    s.status === "next" && "bg-slate-100 text-slate-400",
                  )}
                >
                  {isDone ? (
                    <FontAwesomeIcon icon={faCircleCheck} />
                  ) : (
                    <FontAwesomeIcon icon={icons[s.id]} />
                  )}
                </div>

                <div>
                  <p
                    className={cx(
                      "text-xs font-semibold",
                      isActive ? "text-brand" : "text-slate-500",
                    )}
                  >
                    {s.name}
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase">
                    {s.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Status */}
        <div className="mt-3 text-center text-xs text-slate-600">
          Etapa atual:{" "}
          <span className="font-semibold text-brand">
            {steps[activeIndex]?.name}
          </span>
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

export function StepConfirmacaoServico({
  onNext,
  onShowTerms,
  onShowContrato,
  funcionarios,
  videoUrl = "/videos/video_nr1_demo.mp4",
  imageUrl = "/images/alma4d_express_nobground.png",
}: StepConfirmacaoServicoProps): React.ReactElement {
  const preco = funcionarios * 16;
  const [index, setIndex] = useState(0);
  

  const steps = [
    "Mapear os riscos psicossociais",
    "Classificar pelo grau de risco",
    "Gerar relatório fiscal",
    "Registrar ações corretivas",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % steps.length);
    }, 2500);

    return () => clearInterval(interval);
  }, []); // ⚠️ IMPORTANTE: vazio
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-extrabold text-brand text-center">
        Avaliação Psicossocial NR‑1
      </h2>

      {/* PREÇO */}
      <div className="rounded-xl border bg-white p-4 text-center shadow-sm">
        <p className="text-xs text-slate-500">Valor total</p>
        <p className="text-2xl font-bold text-brand">
          {preco.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        </p>
        <p className="text-xs text-slate-500">
          {funcionarios} funcionários • R$16 por colaborador
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 items-center">
        {/* ESQUERDA */}
        <div className="rounded-xl border p-4 bg-surface-muted">
          <h3 className="font-semibold text-slate-800 mb-2">
            📄 O que você poderá fazer
          </h3>

          <ul className="mt-3 text-sm text-slate-600 list-disc pl-5 space-y-2">
            {steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>

        {/* DIREITA */}
        <div className="relative rounded-xl overflow-hidden border bg-black">
          <video
            src={videoUrl}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />

          <div className="absolute inset-0 backdrop-blur-[2px]" />
          <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/40 to-transparent" />

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <Image
              src={imageUrl}
              alt="alma4D"
              width={120}
              height={120}
              className="mb-2"
              priority
            />

            <p className="text-white/70 text-xs uppercase tracking-widest">
              NR‑1 • Avaliação Psicossocial
            </p>

            <h4 className="text-white text-base sm:text-lg font-semibold mt-2">
              {steps[index]}
            </h4>
          </div>
        </div>
      </div>

      {/* CONTRATO */}
      <div className="rounded-xl border p-4 bg-white space-y-4">
        <h3 className="font-semibold text-slate-800">📜 Contrato e termos</h3>

        <div className="text-sm text-slate-600 space-y-1">
          <p>• Serviço conforme NR‑1</p>
          <p>• Relatório válido para fiscalização</p>
          <p className="font-semibold">
            • Não há reembolso após início do preenchimento
          </p>
        </div>

        <div className="flex gap-4 text-sm">
          <button onClick={onShowTerms} className="underline text-brand">
            Termos de uso
          </button>

          <button onClick={onShowContrato} className="underline text-brand">
            Ver minuta de contrato
          </button>
        </div>

        <label className="flex items-start gap-2">
          <input type="checkbox" />
          <span className="text-sm">
            Declaro que li e concordo com o contrato.
          </span>
        </label>
      </div>

      <button
        onClick={onNext}
        className="w-full h-12 rounded-xl bg-brand text-white font-semibold"
      >
        Continuar para pagamento
      </button>
    </div>
  );
}

/** ===================== Wizard principal (Step 4+) ===================== */

export default function AtivacaoWizard() {
  const searchParams = useSearchParams();  
const razaoSocial = searchParams.get("razaoSocial") ?? "";
const cnpj = searchParams.get("cnpjDigits") ?? "";

  const clienteId = searchParams.get("cliente_id") ?? "";
  const contratoId = searchParams.get("contrato_id") ?? "";
  const funcionariosParam = Number(searchParams.get("funcionarios") || "0");
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const origem = searchParams.get("origem") ?? "site";
  const campanha = searchParams.get("campanha") ?? "";

  // ✅ Começa direto no Step 4 (perfil). OTP já ocorreu no /nr1/empresa
  const [step, setStep] = useState<StepId>(4);

  // Usuário autenticado (deve existir após OTP no public)
  const [userId, setUserId] = useState<string | null>(null);

  // Perfil
  const nomeInicial = searchParams.get("nome") || "";
  const emailInicial = searchParams.get("email") || "";
  const [dataNascimento] = useState("");
  const [sexo] = useState<Sexo>("");
  const [documento, setDocumento] = useState("");

  const [nomeCompleto, setNomeCompleto] = useState(nomeInicial);
  const [email] = useState(emailInicial);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // modal termos
  const [showTerms, setShowTerms] = useState(false);
  const [showContrato, setShowContrato] = useState(false);
  const [isEmancipated] = useState(false);
  const [contratoLido, setContratoLido] = useState(false);

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

  useEffect(() => {
    const iframe = document.getElementById(
      "contrato-frame",
    ) as HTMLIFrameElement;

    if (!iframe) return;

    iframe.onload = () => {
      try {
        const doc = iframe.contentWindow?.document;

        if (!doc) return;

        doc.addEventListener("scroll", () => {
          const scrollTop = doc.documentElement.scrollTop;
          const scrollHeight = doc.documentElement.scrollHeight;
          const clientHeight = doc.documentElement.clientHeight;

          if (scrollTop + clientHeight >= scrollHeight - 20) {
            setContratoLido(true);
          }
        });
      } catch {
        // iframe cross-origin fallback
        setContratoLido(true);
      }
    };
  }, [showContrato]);

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

      setStep(6);
    } catch (e: unknown) {
      setProfileError(
        getErrorMessage(e, "Não foi possível salvar seus dados."),
      );
    } finally {
      setProfileLoading(false);
    }
  }
const contratoUrl = `/api/contrato/preview?nome=${encodeURIComponent(nomeCompleto)}&email=${encodeURIComponent(email)}&cpf=${encodeURIComponent(documento)}&empresa=${encodeURIComponent(razaoSocial)}&cnpj=${encodeURIComponent(cnpj)}&funcionarios=${funcionariosParam}`;
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
              {step === 4 && (
                <StepConfirmacaoServico
                  onNext={() => setStep(5)}
                  onShowTerms={() => setShowTerms(true)}
                  onShowContrato={() => setShowContrato(true)}
                  funcionarios={funcionariosParam}
                  aceitouTermos={aceitouTermos}
                  setAceitouTermos={setAceitouTermos}
                />
              )}
              {/* Step 5: Perfil */}
              {step === 5 && (
                <div className="grid gap-5">
                  {/* HEADER */}
                  <div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-brand">
                      Confirme seus dados
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Revise as informações e finalize sua adesão ao serviço.
                    </p>
                  </div>

                  {/* RESUMO */}
                  <div className="rounded-xl border border-border bg-surface-muted p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-slate-800">
                          {clienteId ? "Empresa cadastrada" : "Empresa"}
                        </p>
                        <p className="text-sm text-slate-600">
                          {funcionariosParam} funcionários
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-slate-500">Valor estimado</p>
                        <p className="text-lg font-bold text-brand">
                          {(funcionariosParam * 16).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* PERFIL */}
                  <div className="grid gap-4">
                    <Field label="Nome completo">
                      <input
                        value={nomeCompleto}
                        onChange={(e) => setNomeCompleto(e.target.value)}
                        placeholder="Seu nome completo"
                        className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-brand/10"
                      />
                    </Field>

                    <Field label="CPF (obrigatório)">
                      <input
                        value={documento}
                        onChange={(e) =>
                          setDocumento(formatCPF(e.target.value))
                        }
                        placeholder="000.000.000-00"
                        className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-brand/10"
                      />
                    </Field>

                    <Field label="E-mail">
                      <input
                        value={email}
                        disabled
                        className="w-full rounded-md border border-border bg-slate-100 px-3 py-2 text-sm text-slate-500"
                      />
                    </Field>

                    {/* ✅ NOVA SEÇÃO DE CONTRATO */}
                    <div className="rounded-xl border p-4 bg-white space-y-3">
                      <h3 className="font-semibold text-slate-800">
                        📜 Contrato e termos
                      </h3>

                      <p className="text-sm text-slate-600">
                        Este serviço inclui a geração de relatório técnico
                        conforme NR‑1, com validade para processos internos e
                        fiscalização.
                      </p>

                      <div className="text-sm text-slate-600 space-y-1">
                        <p>• Avaliação psicossocial conforme NR‑1</p>
                        <p>• Relatório técnico estruturado</p>
                        <p>• Responsabilidade da empresa sobre ações</p>
                        <p className="font-semibold text-slate-700">
                          • Não há reembolso após início do preenchimento
                        </p>
                      </div>

                      {/* LINKS */}
                      <div className="flex gap-4 text-sm">
                        <button
                          type="button"
                          onClick={() => setShowTerms(true)}
                          className="text-brand font-semibold underline"
                        >
                          Termos de uso
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowContrato(true)}
                          className="text-brand font-semibold underline"
                        >
                          Ver contrato completo
                        </button>
                      </div>

                      {/* CHECKBOX */}
                      <label className="flex items-start gap-2">
                        <input type="checkbox" disabled />
                        <span className="text-sm">
                          Leia e aceite o contrato completo para continuar.
                        </span>
                      </label>

                      {/* INFO EXTRA */}
                      <p className="text-xs text-slate-500">
                        O contrato será gerado automaticamente após o pagamento,
                        com registro de data, IP e integridade criptográfica.
                      </p>
                    </div>

                    {/* ERRO */}
                    {profileError && (
                      <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                        {profileError}
                      </div>
                    )}

                    {/* CTA */}
                    <div className="flex justify-end">
                      <PrimaryButton
                        onClick={saveProfileAndContinue}
                        disabled={profileLoading || !userId}
                      >
                        {profileLoading
                          ? "Continuando..."
                          : "Ir para pagamento"}
                      </PrimaryButton>
                    </div>
                  </div>
                </div>
              )}
              {/* Step 6: Pagamento NR‑1 */}
              {step === 6 && userId && (
                <div className="grid gap-5">
                  {/* HEADER */}
                  <div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-brand">
                      Finalizar pagamento
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Escolha o método de pagamento para ativar sua empresa na
                      NR‑1.
                    </p>
                  </div>

                  {/* RESUMO FINAL */}
                  <div className="rounded-xl border border-border bg-surface-muted p-4">
                    <div className="flex items-start justify-between">
                      <div className="grid gap-1">
                        <p className="font-semibold text-slate-800">
                          NR‑1 • COPSOQ II BR
                        </p>
                        <p className="text-sm text-slate-600">
                          {funcionariosParam} funcionários
                        </p>
                        <p className="text-xs text-slate-500">
                          Cliente: {clienteId.slice(0, 8)}...
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-slate-500">Total estimado</p>
                        <p className="text-lg font-bold text-brand">
                          {(funcionariosParam * 16).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* PAGAMENTO */}
                  <div className="rounded-xl border border-border bg-white p-4">
                    <NR1PaymentPanel
                      userId={userId}
                      clienteId={clienteId}
                      contratoId={contratoId}
                      funcionariosInitial={funcionariosParam || 1}
                      nomeCompleto={nomeCompleto}
                      email={email}
                      documento={documento}
                      origem={origem}
                      campanha={campanha || null}
                    />
                  </div>

                  {/* SEGURANÇA / CONFIANÇA */}
                  <div className="text-xs text-slate-500 text-center">
                    ✔ Pagamento seguro • ✔ Dados protegidos • ✔ Ativação
                    automática após confirmação
                  </div>
                </div>
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
                      src="/legal/terms.html"
                      title="Termos de Uso"
                      className="w-full h-full border-0"
                    />
                  </div>
                </div>
              )}

              {showContrato && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                  <div className="bg-white w-full max-w-3xl h-[85vh] rounded-xl flex flex-col">
                    {/* HEADER */}
                    <div className="flex justify-between items-center p-4 border-b">
                      <h2 className="font-bold text-brand">Contrato</h2>
                      <button onClick={() => setShowContrato(false)}>
                        Fechar
                      </button>
                    </div>

                    {/* IFRAME */}
                    <div className="flex-1">
                      <iframe
                        id="contrato-frame"
                        src={contratoUrl}
                        className="w-full h-full border-0"
                      />
                    </div>

                    {/* ACEITE */}
                    <div className="p-4 border-t space-y-3">
                      <label className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          disabled={!contratoLido}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAceitouTermos(true);
                              setShowContrato(false);
                            }
                          }}
                          className="mt-1 w-5 h-5 accent-brand cursor-pointer"
                        />
                        <span className="text-md">
                          Declaro que li integralmente este documento e concordo
                          com seus termos.
                        </span>
                      </label>

                      {!contratoLido && (
                        <p className="text-xs text-red-500">
                          Leia o contrato até o final para habilitar o aceite
                        </p>
                      )}
                    </div>
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
