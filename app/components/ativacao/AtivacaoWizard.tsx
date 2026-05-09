"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faLightbulb,
  faCircleCheck,
  faUserCheck,
  faCreditCard,
  faLock,
  faShieldHalved,
} from "@fortawesome/free-solid-svg-icons";
import { NR1PaymentPanel } from "../../ativacao/_components/NR1PaymentPanel";
import Image from "next/image"

/** -------------------- Utils -------------------- */
type StepId = 1 | 2 | 3;
type StepStatus = "done" | "active" | "next";
type Step = {
  id: StepId;
  name: string;
  desc: string;
  status: StepStatus;
  icon: IconDefinition;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
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

/** -------------------- UI Blocks -------------------- */
function StepperStripe({ current }: { current: StepId }) {
  const steps: Step[] = [
    {
      id: 1,
      name: "Serviço",
      desc: "Revisão + termos",
      status: current === 1 ? "active" : current > 1 ? "done" : "next",
      icon: faLightbulb,
    },
    {
      id: 2,
      name: "Dados",
      desc: "Confirmação",
      status: current === 2 ? "active" : current > 2 ? "done" : "next",
      icon: faUserCheck,
    },
    {
      id: 3,
      name: "Pagamento",
      desc: "Checkout",
      status: current === 3 ? "active" : "next",
      icon: faCreditCard,
    },
  ];

  const activeIndex = steps.findIndex((s) => s.status === "active");
  const progress = ((activeIndex + 1) / steps.length) * 100;

  return (
    <section className="mt-4">
      <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-500">
            Etapa <span className="text-brand">{activeIndex + 1}</span> de{" "}
            {steps.length}
          </p>
          <p className="text-xs text-slate-500">
            Atual:{" "}
            <span className="font-semibold text-brand">
              {steps[activeIndex]?.name}
            </span>
          </p>
        </div>

        <div className="mt-3 relative h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
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
                    <FontAwesomeIcon icon={s.icon} />
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
      </div>
    </section>
  );
}

function SummarySticky({
  funcionarios,
  precoPorColab = 16,
  clienteId,
}: {
  funcionarios: number;
  precoPorColab?: number;
  clienteId?: string;
}) {
  const total = Math.max(funcionarios, 1) * precoPorColab;

  return (
    <aside className="lg:sticky lg:top-6 space-y-4">
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <p className="text-xs text-slate-500">Resumo</p>
        <p className="mt-1 text-lg font-extrabold text-brand">
          NR‑1 • COPSOQ II BR
        </p>

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Colaboradores</span>
            <span className="font-semibold text-slate-800">
              {Math.max(funcionarios, 1)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Preço por colaborador</span>
            <span className="font-semibold text-slate-800">
              {precoPorColab.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </div>

          <div className="h-px bg-border my-2" />

          <div className="flex items-center justify-between">
            <span className="text-slate-700 font-semibold">Total</span>
            <span className="text-brand font-extrabold text-lg">
              {total.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-surface-muted p-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faLock} className="text-brand-secondary" />
            Checkout seguro • dados protegidos
          </div>
          {clienteId ? (
            <div className="mt-1 text-[11px] text-slate-500">
              Cliente: {clienteId.slice(0, 8)}...
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4 text-xs text-slate-600">
        <div className="flex items-start gap-2">
          <FontAwesomeIcon
            icon={faShieldHalved}
            className="mt-0.5 text-brand-secondary"
          />
          <div>
            <p className="font-semibold text-slate-800">Confiabilidade</p>
            <p className="mt-1">
              • Conformidade NR‑1 • Relatório técnico estruturado • Ativação
              após confirmação.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function PrimaryCTA({
  disabled,
  loading,
  label,
  disabledLabel,
  onClick,
}: {
  disabled?: boolean;
  loading?: boolean;
  label: string;
  disabledLabel?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={cx(
        "w-full h-12 rounded-xl font-semibold transition-all",
        disabled || loading
          ? "bg-border text-slate-400 cursor-not-allowed"
          : "bg-brand text-white hover:brightness-95 active:brightness-90",
      )}
    >
      {loading
        ? "Processando..."
        : disabled
          ? (disabledLabel ?? "Complete para continuar")
          : label}
    </button>
  );
}

/** -------------------- Steps -------------------- */
function Step1Servico({
  funcionarios,
  aceitouTermos,
  setAceitouTermos,
  contratoLido,
  setContratoLido,
  onOpenTerms,
  onOpenContrato,
  onNext,
}: {
  funcionarios: number;
  aceitouTermos: boolean;
  setAceitouTermos: (v: boolean) => void;
  contratoLido: boolean;
  setContratoLido: (v: boolean) => void;
  onOpenTerms: () => void;
  onOpenContrato: () => void;
  onNext: () => void;
}) {
  const preco = Math.max(funcionarios, 1) * 16;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-brand">
          Revise o serviço
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Confirme o escopo e aceite os termos para seguir.
        </p>
      </div>

      {/* Card de valor (curto e claro) */}
      <div className="rounded-2xl border border-border bg-surface p-5">
        <p className="text-xs text-slate-500">Valor total</p>
        <p className="mt-1 text-2xl font-extrabold text-brand">
          {preco.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {Math.max(funcionarios, 1)} colaboradores • R$16 por colaborador
        </p>
      </div>

      {/* O que você recebe */}
      <div className="rounded-2xl border border-border bg-surface-muted p-5">
        <h3 className="font-semibold text-slate-800">
          O que você poderá fazer
        </h3>
        <ul className="mt-3 text-sm text-slate-600 list-disc pl-5 space-y-2">
          <li>Mapear riscos psicossociais</li>
          <li>Classificar pelo grau de risco</li>
          <li>Gerar relatório técnico</li>
          <li>Registrar ações corretivas</li>
        </ul>
      </div>

      {/* Termos / Contrato */}
      <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
        <h3 className="font-semibold text-slate-800">Contrato e termos</h3>

        <div className="text-sm text-slate-600 space-y-1">
          <p>• Serviço conforme NR‑1</p>
          <p>• Relatório válido para fiscalização</p>
          <p className="font-semibold text-slate-700">
            • Não há reembolso após início do preenchimento
          </p>
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          <button
            type="button"
            onClick={onOpenTerms}
            className="underline text-brand font-semibold"
          >
            Termos de uso
          </button>
          <button
            type="button"
            onClick={onOpenContrato}
            className="underline text-brand font-semibold"
          >
            Ver contrato completo
          </button>
        </div>

        {/* Aceite (bloqueia avanço) */}
        <label
          className={cx(
            "flex items-start gap-3 rounded-xl border border-border p-4 transition",
            contratoLido ? "bg-white" : "bg-surface-muted",
          )}
        >
          <input
            type="checkbox"
            checked={aceitouTermos}
            disabled={!contratoLido}
            onChange={(e) => setAceitouTermos(e.target.checked)}
            className="mt-1 w-5 h-5 accent-(--brand)]"
          />
          <div className="space-y-1">
            <p className="text-sm text-slate-700 font-semibold">
              Eu li e concordo com os termos e o contrato.
            </p>
            {!contratoLido ? (
              <p className="text-xs text-slate-500">
                Abra o contrato e role até o final para habilitar o aceite.
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                Aceite liberado. Você pode avançar.
              </p>
            )}
          </div>
        </label>

        {/* fallback manual (caso o scroll tracking falhe por qualquer motivo) */}
        {!contratoLido ? (
          <button
            type="button"
            onClick={() => setContratoLido(true)}
            className="text-xs text-brand-secondary font-semibold underline"
          >
            Não consigo rolar o contrato — habilitar aceite manualmente
          </button>
        ) : null}
      </div>

      <PrimaryCTA
        onClick={onNext}
        disabled={!aceitouTermos}
        label="Continuar cadastro"
        disabledLabel="Aceite os termos para continuar"
      />
    </div>
  );
}

function Step2Dados({
  funcionarios,
  nomeCompleto,
  setNomeCompleto,
  documento,
  setDocumento,
  email,
  setEmail,
  aceitouTermos,
  onBack,
  onNext,
  loading,
  error,
}: {
  funcionarios: number;
  nomeCompleto: string;
  setNomeCompleto: (v: string) => void;
  documento: string;
  setDocumento: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  aceitouTermos: boolean;
  onBack: () => void;
  onNext: () => void;
  loading: boolean;
  error: string | null;
}) {
  const cpfDigits = onlyDigits(documento);
  const emailOk = email ? isValidEmailLoose(email) : false;
  const nomeOk = isValidNameLoose(nomeCompleto);
  const cpfOk = cpfDigits.length === 11 && isValidCPF(cpfDigits);
  const canContinue = nomeOk && cpfOk && emailOk && aceitouTermos && !loading;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-brand">
          Confirme seus dados
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          O representante da empresa para esta atividade:
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-surface-muted p-4 flex items-start justify-between">
        <div>
          <p className="font-semibold text-slate-800">Empresa cadastrada</p>
          <p className="text-sm text-slate-600">
            {Math.max(funcionarios, 1)} funcionários
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Total</p>
          <p className="text-lg font-extrabold text-brand">
            {(Math.max(funcionarios, 1) * 16).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-700">
            Nome completo
          </span>
          <input
            value={nomeCompleto}
            onChange={(e) => setNomeCompleto(e.target.value)}
            placeholder="Seu nome completo"
            className={cx(
              "w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-4",
              nomeCompleto.length === 0
                ? "border-border focus:ring-brand/10"
                : nomeOk
                  ? "border-brand-secondary/40 focus:ring-brand-secondary/10"
                  : "border-brand-accent/40 focus:ring-brand-accent/10",
            )}
          />
          {nomeCompleto.length > 0 && !nomeOk ? (
            <span className="text-xs text-brand-accent">
              Informe um nome válido.
            </span>
          ) : null}
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-700">
            CPF (obrigatório)
          </span>
          <input
            value={documento}
            onChange={(e) => setDocumento(formatCPF(e.target.value))}
            placeholder="000.000.000-00"
            inputMode="numeric"
            className={cx(
              "w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-4",
              documento.length === 0
                ? "border-border focus:ring-brand/10"
                : cpfOk
                  ? "border-brand-secondary/40 focus:ring-brand-secondary/10"
                  : "border-brand-accent/40 focus:ring-brand-accent/10",
            )}
          />
          {documento.length > 0 && !cpfOk ? (
            <span className="text-xs text-brand-accent">CPF inválido.</span>
          ) : null}
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-700">
            E‑mail (para envio do recibo)
          </span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@empresa.com"
            className={cx(
              "w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-4",
              email.length === 0
                ? "border-border focus:ring-brand/10"
                : emailOk
                  ? "border-brand-secondary/40 focus:ring-brand-secondary/10"
                  : "border-brand-accent/40 focus:ring-brand-accent/10",
            )}
          />
          {email.length > 0 && !emailOk ? (
            <span className="text-xs text-brand-accent">E‑mail inválido.</span>
          ) : null}
        </label>

        <div className="rounded-xl border border-border bg-surface p-4 text-xs text-slate-600">
          <p className="font-semibold text-slate-800">Termos</p>
          <p className="mt-1">
            {aceitouTermos ? (
              <span className="text-brand-secondary font-semibold">
                ✓ Termos aceitos
              </span>
            ) : (
              <span className="text-brand-accent font-semibold">
                ⚠ Termos não aceitos
              </span>
            )}
          </p>
        </div>

        {error ? (
          <div className="rounded-xl border border-brand-accent/30 bg-brand-accent/10 p-3 text-sm text-brand-accent">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onBack}
            className="h-12 rounded-xl border border-border bg-white font-semibold text-slate-700 hover:bg-surface-muted"
          >
            Voltar
          </button>

          <PrimaryCTA
            onClick={onNext}
            disabled={!canContinue}
            loading={loading}
            label="Ir para pagamento"
            disabledLabel="Complete os dados para continuar"
          />
        </div>
      </div>
    </div>
  );
}

function Step3Pagamento({
  userId,
  clienteId,
  contratoId,
  funcionarios,
  onFuncionariosChange,
  nomeCompleto,
  email,
  documento,
  origem,
  campanha,
}: {
  userId: string;
  clienteId: string;
  contratoId: string;
  funcionarios: number;
  onFuncionariosChange: (v: number) => void;
  nomeCompleto: string;
  email: string;
  documento: string;
  origem: string;
  campanha: string | null;
}): React.ReactElement {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-brand">
          Pagamento
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Escolha o meio de pagamento:
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4">
        <NR1PaymentPanel
          userId={userId}
          clienteId={clienteId}
          contratoId={contratoId}
          funcionarios={funcionarios}
          onFuncionariosChange={onFuncionariosChange}
          nomeCompleto={nomeCompleto}
          email={email}
          documento={onlyDigits(documento)}
          origem={origem}
          campanha={campanha}
        />
      </div>

      <div className="text-xs text-slate-500 text-center">
        ✔ Pagamento seguro • ✔ Dados protegidos • ✔ Ativação automática
      </div>
    </div>
  );
}


/** -------------------- Wizard Principal -------------------- */
export default function AtivacaoWizard() {
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

  const searchParams = useSearchParams();

  const clienteId = searchParams.get("cliente_id") ?? "";
  // aceita os dois formatos para não quebrar links antigos
  const contratoId =
    searchParams.get("contrato_id") ?? searchParams.get("contrato_Id") ?? "";

  const funcionariosParam = Number(searchParams.get("funcionarios") || "0");
  const origem = searchParams.get("origem") ?? "site";
  const campanha = searchParams.get("campanha") ?? "";

  // Step state
  const [step, setStep] = useState<StepId>(1);

  // Sessão Supabase (OTP já ocorreu antes)
  const [userId, setUserId] = useState<string | null>(null);
  
  // Step 1: termos/contrato
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [contratoLido, setContratoLido] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showContrato, setShowContrato] = useState(false);

  // Step 2: perfil (agora email é editável para não travar)
  const [nomeCompleto, setNomeCompleto] = useState(
    searchParams.get("nome") || "",
  );
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [documento, setDocumento] = useState("");

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [funcionarios, setFuncionarios] = useState(funcionariosParam || 1);

  // contrato preview
  const contratoUrl = contratoId
    ? `/api/contrato/preview?contratoId=${contratoId}`
    : "";

  /** Captura usuário autenticado */
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!mounted) return;

      if (error || !data.user?.id) {
        setUserId(null);        
        return;
      }

      setUserId(data.user.id);
    })();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  /** Tracking de “leu o contrato” (mesma origem: /api/contrato/preview) */
  useEffect(() => {
    if (!showContrato) return;

    const iframe = document.getElementById(
      "contrato-frame",
    ) as HTMLIFrameElement | null;
    if (!iframe) return;

    iframe.onload = () => {
      try {
        const doc = iframe.contentWindow?.document;
        if (!doc) return;

        const onScroll = () => {
          const scrollTop = doc.documentElement.scrollTop;
          const scrollHeight = doc.documentElement.scrollHeight;
          const clientHeight = doc.documentElement.clientHeight;
          if (scrollTop + clientHeight >= scrollHeight - 20) {
            setContratoLido(true);
          }
        };

        doc.addEventListener("scroll", onScroll, { passive: true });
      } catch {
        // fallback: NÃO libera automaticamente
        setContratoLido(false);
      }
    };
  }, [showContrato]);

  async function saveProfileAndContinue() {
    setProfileError(null);
    setProfileLoading(true);

    try {
      if (!userId)
        throw new Error("Sessão inválida. Refaça a validação do telefone.");
      if (!aceitouTermos)
        throw new Error("Você precisa aceitar os termos para continuar.");

      const nome = nomeCompleto.trim();
      const mail = email.trim().toLowerCase();
      const cpfDigits = onlyDigits(documento);

      if (!isValidNameLoose(nome))
        throw new Error("Informe um nome completo válido.");
      if (!isValidEmailLoose(mail)) throw new Error("E-mail inválido.");
      if (cpfDigits.length !== 11 || !isValidCPF(cpfDigits))
        throw new Error("CPF inválido.");

      // Busca usuário atual para não resetar campos existentes
      const { data: existingUser, error: fetchErr } = await supabase
        .from("usuarios")
        .select(
          "id, telefone, role, tipo_plano, data_inicio_plano, data_expiracao_plano",
        )
        .eq("id", userId)
        .maybeSingle();

      if (fetchErr) throw new Error(fetchErr.message);

      const payload = {
        id: userId,
        telefone: existingUser?.telefone ?? null,
        nome_completo: nome,
        email: mail,
        documento: cpfDigits,
        aceitou_termos: true,
        premium_origem: "pagarme" as const,
        // mantém plano/role se já existirem (não forço aqui pra não criar regressão)
        role: existingUser?.role ?? "usuario",
        tipo_plano: existingUser?.tipo_plano ?? "trial",
        data_inicio_plano:
          existingUser?.data_inicio_plano ?? new Date().toISOString(),
        data_expiracao_plano:
          existingUser?.data_expiracao_plano ??
          new Date(Date.now() + 7 * 864e5).toISOString(),
      };

      const { error: upsertErr } = await supabase
        .from("usuarios")
        .upsert(payload, { onConflict: "id" });
      if (upsertErr) throw new Error(upsertErr.message);

      setStep(3);
    } catch (e: unknown) {
      setProfileError(
        e instanceof Error ? e.message : "Não foi possível salvar seus dados.",
      );
    } finally {
      setProfileLoading(false);
    }
  }

  return (
    <main
      className="min-h-screen bg-surface-muted overflow-x-hidden"
      aria-label="Ativação alma4D"
    >
      {/* Header */}
      <div className="bg-linear-to-b from-white/70 to-transparent">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-3 flex items-start justify-between gap-4">
          {/* ESQUERDA (texto) */}
          <div className="flex-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span className="inline-flex h-2 w-2 rounded-full bg-brand-secondary" />
              Ativação guiada (NR‑1)
            </div>

            <div className="mt-4 max-w-3xl">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-brand tracking-tight">
                Finalize em poucos passos
              </h1>
              <p className="mt-2 text-sm sm:text-base text-slate-600">
                Confira e complete os dados abaixo:
              </p>
            </div>
          </div>

          {/* ✅ DIREITA (logo alinhado) */}
          <div className="shrink-0 flex items-start">
            <Image
              src="/images/alma4d_express_nobground.png"
              alt="alma4D"
              width={92}
              height={92}
              className="opacity-90 drop-shadow-sm"
              priority
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-12">
        <StepperStripe current={step} />

        <section className="mt-5 grid lg:grid-cols-[1fr_360px] gap-6 items-start">
          {/* Conteúdo */}
          <div className="rounded-2xl border border-border bg-surface p-4 sm:p-6 shadow-[0_25px_70px_rgba(3,8,112,0.10)]">
            {step === 1 && (
              <Step1Servico
                funcionarios={funcionarios}
                aceitouTermos={aceitouTermos}
                setAceitouTermos={setAceitouTermos}
                contratoLido={contratoLido}
                setContratoLido={setContratoLido}
                onOpenTerms={() => setShowTerms(true)}
                onOpenContrato={() => setShowContrato(true)}
                onNext={() => setStep(2)}
              />
            )}

            {step === 2 && (
              <Step2Dados
                funcionarios={funcionarios}
                nomeCompleto={nomeCompleto}
                setNomeCompleto={setNomeCompleto}
                documento={documento}
                setDocumento={setDocumento}
                email={email}
                setEmail={setEmail}
                aceitouTermos={aceitouTermos}
                onBack={() => setStep(1)}
                onNext={saveProfileAndContinue}
                loading={profileLoading}
                error={profileError}
              />
            )}

            {step === 3 && userId && (
              <Step3Pagamento
                userId={userId}
                clienteId={clienteId}
                contratoId={contratoId}
                funcionarios={funcionarios}
                onFuncionariosChange={setFuncionarios}
                nomeCompleto={nomeCompleto}
                email={email}
                documento={documento}
                origem={origem}
                campanha={campanha || null}
              />
            )}
          </div>

          {/* Resumo sticky */}
          <SummarySticky funcionarios={funcionarios} clienteId={clienteId} />
        </section>

        {/* Modais */}
        {showTerms && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white w-full max-w-3xl h-[85vh] rounded-2xl shadow-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h2 className="font-extrabold text-brand">Termos de Uso</h2>
                <button
                  type="button"
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
            <div className="bg-white w-full max-w-3xl h-[85vh] rounded-2xl flex flex-col overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b">
                <h2 className="font-extrabold text-brand">Contrato</h2>
                <button
                  type="button"
                  onClick={() => setShowContrato(false)}
                  className="text-slate-600 font-semibold"
                >
                  Fechar
                </button>
              </div>

              <div className="flex-1">
                <iframe
                  id="contrato-frame"
                  src={contratoUrl || "/legal/placeholder.html"}
                  className="w-full h-full border-0"
                  title="Contrato"
                />
              </div>

              <div className="p-4 border-t space-y-3">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={aceitouTermos}
                    disabled={!contratoLido}
                    onChange={(e) => {
                      setAceitouTermos(e.target.checked);
                      if (e.target.checked) setShowContrato(false);
                    }}
                    className="mt-1 w-5 h-5 accent-(--brand)]"
                  />
                  <span className="text-sm text-slate-700">
                    Declaro que li integralmente este documento e concordo com
                    seus termos.
                  </span>
                </label>

                {!contratoLido ? (
                  <p className="text-xs text-brand-accent">
                    Role até o final para habilitar o aceite.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        )}

        <footer className="mt-10 text-center text-slate-400 text-xs font-semibold pb-6">
          alma4D • Sincronização segura • 2026
        </footer>
      </div>
    </main>
  );
}
