"use client";

import React, { useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  Mail,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import { NR1SubNav } from "../_components/NR1SubNav";

type FormState = "idle" | "submitting" | "success" | "error";

type EmpresaForm = {
  razaoSocial: string;
  cnpjDigits: string; // guardamos só dígitos
  email: string;
  telefoneRaw: string; // digitado pelo usuário (com máscara)
  telefoneE164: string; // normalizado (+55...)
  responsavel: string;
  funcionarios: number;
  aceiteLgpd: boolean;
};

type EmpresaApiResponse = {
  success?: boolean;
  cliente_id?: string;
  contrato_id?: string;
  error?: string;
};

function onlyDigits(v: string) {
  return v.replace(/\D/g, "");
}

/** Nome: letras + alguns símbolos comuns. Evita "###" e "123" puro. */
function isValidNameLoose(v: string) {
  const s = v.trim();
  if (s.length < 2) return false;
  // precisa ter pelo menos 1 letra
  if (!/[A-Za-zÀ-ÿ]/.test(s)) return false;
  // permite letras, números, espaço e caracteres comuns em nomes/razão social
  return /^[A-Za-zÀ-ÿ0-9 .,'&()-]{2,}$/.test(s);
}

/** Email: simples e bom (sem tentar cobrir RFC inteiro). */
function isValidEmail(email: string) {
  const s = email.trim();
  if (s.length < 6) return false;
  return /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(s);
}

function formatCNPJ(input: string) {
  const d = onlyDigits(input).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
}

/** Validação real de CNPJ (DV). */
function isValidCNPJ(cnpjDigits: string): boolean {
  const cnpj = onlyDigits(cnpjDigits);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;

  const calc = (base: string, factors: number[]) => {
    const sum = base
      .split("")
      .reduce((acc, dig, i) => acc + Number(dig) * factors[i], 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const base = cnpj.slice(0, 12);
  const d1 = calc(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calc(base + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

  return d1 === Number(cnpj[12]) && d2 === Number(cnpj[13]);
}

/** Máscara simples de telefone BR: (11) 99999-9999 ou (11) 9999-9999 */
function formatPhoneBR(raw: string) {
  const d = onlyDigits(raw).slice(0, 11);
  if (d.length <= 2) return d;
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);

  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  if (rest.length <= 8) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
}

/** Normaliza pra E.164. Aceita já vir com +55... */
function normalizePhoneBRToE164(input: string) {
  const raw = input.trim();
  if (!raw) return "";
  if (raw.startsWith("+")) return raw.replace(/\s+/g, "");

  const digits = onlyDigits(raw);
  if (!digits) return "";
  if (digits.startsWith("55")) return `+${digits}`;
  return `+55${digits}`;
}

function isValidE164Phone(phone: string) {
  return /^\+\d{10,15}$/.test(phone);
}

export default function EmpresaNR1Page() {
  const supabase = useMemo(() => {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }, []);

  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // OTP state
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  const [form, setForm] = useState<EmpresaForm>({
    razaoSocial: "",
    cnpjDigits: "",
    email: "",
    telefoneRaw: "",
    telefoneE164: "",
    responsavel: "",
    funcionarios: 0,
    aceiteLgpd: false,
  });

  function update<K extends keyof EmpresaForm>(key: K, value: EmpresaForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validarFormulario(f: EmpresaForm): string | null {
    if (!isValidNameLoose(f.razaoSocial))
      return "Informe uma razão social válida.";
    if (!isValidCNPJ(f.cnpjDigits)) return "CNPJ inválido.";
    if (!isValidEmail(f.email)) return "E‑mail inválido.";

    if (!isValidNameLoose(f.responsavel))
      return "Informe um responsável válido.";

    if (!Number.isInteger(f.funcionarios) || f.funcionarios <= 0) {
      return "Número de funcionários inválido.";
    }

    if (!f.aceiteLgpd) return "É obrigatório aceitar a LGPD.";

    // telefone só fica válido depois que normalizamos
    if (!isValidE164Phone(f.telefoneE164)) {
      return "Telefone inválido. Use DDD e número (ex.: 11 99999-9999).";
    }

    return null;
  }

  async function sendOtp() {
    setOtpError(null);
    setOtpLoading(true);

    try {
      const e164 = normalizePhoneBRToE164(form.telefoneRaw);
      if (!isValidE164Phone(e164)) {
        throw new Error(
          "Informe um telefone válido com DDD (ex.: 11 99999-9999).",
        );
      }

      update("telefoneE164", e164);

      const { error } = await supabase.auth.signInWithOtp({ phone: e164 });
      if (error) throw new Error(error.message);

      setOtpSent(true);
      setOtpVerified(false);
    } catch (e: unknown) {
      setOtpError(
        e instanceof Error ? e.message : "Não foi possível enviar o código.",
      );
    } finally {
      setOtpLoading(false);
    }
  }

  async function verifyOtp() {
    setOtpError(null);
    setOtpLoading(true);

    try {
      const phone = form.telefoneE164;
      if (!isValidE164Phone(phone)) throw new Error("Telefone inválido.");
      if (!otp || otp.trim().length < 4)
        throw new Error("Informe o código recebido.");

      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token: otp.trim(),
        type: "sms",
      });

      if (error) throw new Error(error.message);
      if (!data.user?.id)
        throw new Error("Não foi possível autenticar o usuário.");

      setOtpVerified(true);
    } catch (e: unknown) {
      setOtpError(
        e instanceof Error ? e.message : "Código inválido ou expirado.",
      );
      setOtpVerified(false);
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    // exige OTP verificado
    if (!otpVerified) {
      setErrorMsg("Valide o telefone via código SMS antes de continuar.");
      return;
    }

    // valida com E.164 garantido
    const erro = validarFormulario(form);
    if (erro) {
      setErrorMsg(erro);
      return;
    }

    try {
      setState("submitting");

      const res = await fetch("/api/nr1/empresa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // envia o formato que sua API espera
        body: JSON.stringify({
          razaoSocial: form.razaoSocial.trim(),
          cnpj: form.cnpjDigits,
          email: form.email.trim(),
          telefone: form.telefoneE164,
          responsavel: form.responsavel.trim(),
          funcionarios: form.funcionarios,
          aceiteLgpd: form.aceiteLgpd,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as EmpresaApiResponse;

      if (!res.ok) {
        console.error("Erro /api/nr1/empresa:", data);
        throw new Error(data.error ?? "Erro desconhecido");
      }

      if (!data.cliente_id || !data.contrato_id) {
        throw new Error("Resposta inválida da API.");
      }

      setState("success");

      window.location.href =
        `/ativacao?tipo=empresa&origem=nr1` +
        `&cliente_id=${data.cliente_id}` +
        `&contrato_id=${data.contrato_id}` +
        `&funcionarios=${form.funcionarios}` +
        `&nome=${encodeURIComponent(form.responsavel)}` +
        `&email=${encodeURIComponent(form.email)}`;

    } catch (err) {
      console.error(err);
      setState("error");
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Não foi possível enviar os dados. Tente novamente.",
      );
    }
  }

  return (
    <main className="min-h-screen bg-surface-muted">
      <div className="max-w-3xl mx-auto px-6 py-6">
        <NR1SubNav />

        <div className="text-center">
          <Building2 size={40} className="mx-auto text-brand" />
          <h1 className="mt-4 text-3xl font-extrabold text-brand">
            Riscos Psicossociais — NR‑1
          </h1>
          <p className="mt-4 text-slate-600">
            Preencha os dados da empresa. Em seguida, valide o telefone do
            responsável via SMS.
          </p>
        </div>

        {(state === "idle" || state === "submitting" || state === "error") && (
          <form
            onSubmit={handleSubmit}
            className="mt-10 rounded-2xl bg-surface border border-border p-8 space-y-6"
          >
            {/* Razão social */}
            <div>
              <label className="text-sm font-medium text-slate-700">
                Razão social
              </label>
              <input
                type="text"
                value={form.razaoSocial}
                onChange={(e) => update("razaoSocial", e.target.value)}
                className="mt-1 w-full h-11 rounded-lg border border-border px-3 text-sm"
                required
                autoCapitalize="words"
                autoCorrect="off"
                autoComplete="organization"
                enterKeyHint="next"
              />
            </div>

            {/* CNPJ + Funcionários */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  CNPJ
                </label>
                <input
                  type="text"
                  value={formatCNPJ(form.cnpjDigits)}
                  onChange={(e) =>
                    update(
                      "cnpjDigits",
                      onlyDigits(e.target.value).slice(0, 14),
                    )
                  }
                  className="mt-1 w-full h-11 rounded-lg border border-border px-3 text-sm"
                  required
                  inputMode="numeric"
                  maxLength={18}
                  pattern="\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}"
                  autoComplete="off"
                  enterKeyHint="next"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Nº de funcionários
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.funcionarios || ""}
                  onChange={(e) =>
                    update("funcionarios", Number(e.target.value))
                  }
                  className="mt-1 w-full h-11 rounded-lg border border-border px-3 text-sm"
                  required
                  inputMode="numeric"
                  enterKeyHint="next"
                />
              </div>
            </div>

            {/* Responsável */}
            <div>
              <label className="text-sm font-medium text-slate-700">
                Responsável pelo preenchimento
              </label>
              <input
                type="text"
                value={form.responsavel}
                onChange={(e) => update("responsavel", e.target.value)}
                className="mt-1 w-full h-11 rounded-lg border border-border px-3 text-sm"
                required
                autoCapitalize="words"
                autoCorrect="off"
                autoComplete="name"
                enterKeyHint="next"
              />
            </div>

            {/* Email */}
            <div>
              <label className="text-sm font-medium text-slate-700">
                E‑mail de contato
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  className="pl-9 mt-1 w-full h-11 rounded-lg border border-border px-3 text-sm"
                  required
                  autoComplete="email"
                  inputMode="email"
                  enterKeyHint="next"
                />
              </div>
            </div>

            {/* Telefone + OTP */}
            <div className="rounded-xl border border-border bg-surface-muted p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-brand-secondary" />
                <p className="text-sm font-semibold text-slate-800">
                  Validação do telefone (SMS)
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Telefone do responsável
                </label>
                <input
                  type="tel"
                  value={formatPhoneBR(form.telefoneRaw)}
                  onChange={(e) => {
                    update("telefoneRaw", e.target.value);
                    update("telefoneE164", ""); // invalida E.164
                    setOtpVerified(false);
                    setOtpSent(false);
                    setOtp("");
                    setOtpError(null);
                  }}
                  className="mt-1 w-full h-11 rounded-lg border border-border px-3 text-sm"
                  placeholder="(11) 99999-9999"
                  required
                  inputMode="tel"
                  autoComplete="tel"
                  enterKeyHint="send"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Você receberá um código por SMS. Usamos o formato
                  internacional automaticamente (+55).
                </p>
              </div>

              {!otpSent ? (
                <button
                  type="button"
                  onClick={sendOtp}
                  disabled={otpLoading}
                  className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-brand text-white font-semibold hover:bg-brand-highlight transition disabled:opacity-60"
                >
                  {otpLoading ? "Enviando..." : "Enviar código SMS"}
                </button>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Código recebido
                    </label>
                    <input
                      value={otp}
                      onChange={(e) =>
                        setOtp(onlyDigits(e.target.value).slice(0, 6))
                      }
                      className="mt-1 w-full h-11 rounded-lg border border-border px-3 text-sm tracking-widest"
                      placeholder="000000"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      enterKeyHint="done"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={verifyOtp}
                      disabled={otpLoading || otp.length < 4}
                      className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-brand text-white font-semibold hover:bg-brand-highlight transition disabled:opacity-60"
                    >
                      {otpLoading ? "Validando..." : "Validar código"}
                    </button>

                    <button
                      type="button"
                      onClick={sendOtp}
                      disabled={otpLoading}
                      className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-border bg-surface text-slate-700 font-semibold hover:bg-surface-muted transition disabled:opacity-60"
                    >
                      Reenviar código
                    </button>
                  </div>

                  {otpVerified && (
                    <div className="rounded-lg bg-brand-secondary/10 text-brand-secondary p-3 text-sm font-semibold">
                      ✅ Telefone verificado com sucesso.
                    </div>
                  )}
                </div>
              )}

              {otpError && (
                <div className="rounded-lg bg-brand-accent/10 text-brand-accent p-3 text-sm">
                  {otpError}
                </div>
              )}
            </div>

            {/* LGPD */}
            <div className="flex gap-3 items-start">
              <input
                type="checkbox"
                checked={form.aceiteLgpd}
                onChange={(e) => update("aceiteLgpd", e.target.checked)}
                className="mt-1"
              />
              <p className="text-sm text-slate-600">
                Declaro que os dados serão utilizados exclusivamente para fins
                de gestão de riscos ocupacionais, conforme a LGPD.
              </p>
            </div>

            {errorMsg && (
              <div className="rounded-lg bg-brand-accent/10 text-brand-accent p-3 text-sm">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={state === "submitting" || !otpVerified}
              className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-brand text-white font-semibold hover:bg-brand-highlight transition disabled:opacity-60"
            >
              {state === "submitting" ? (
                "Enviando..."
              ) : (
                <>
                  Continuar <ArrowRight size={18} />
                </>
              )}
            </button>

            {!otpVerified && (
              <p className="text-xs text-slate-500 text-center">
                Para continuar, valide o telefone via SMS.
              </p>
            )}
          </form>
        )}

        {state === "success" && (
          <div className="mt-10 rounded-2xl bg-surface border border-border p-8 text-center">
            <CheckCircle2 size={40} className="mx-auto text-brand-secondary" />
            <h2 className="mt-4 text-2xl font-extrabold text-brand">
              Cadastro recebido e telefone validado
            </h2>
            <p className="mt-4 text-slate-600">
              Próximo passo: contrato e pagamento.
            </p>
          </div>
        )}

        <div className="mt-10 text-xs text-slate-500 text-center">
          ✔ Metodologia validada • ✔ Conformidade NR‑1 • ✔ LGPD
        </div>
      </div>
    </main>
  );
}
