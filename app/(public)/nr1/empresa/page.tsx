"use client";

import { useMemo, useState } from "react";
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
  cnpj: string;
  email: string;
  telefone: string; // vamos armazenar em E.164 (+55...)
  responsavel: string;
  funcionarios: number;
  aceiteLgpd: boolean;
};

function onlyDigits(v: string) {
  return v.replace(/\D/g, "");
}

function normalizePhoneBR(input: string) {
  const raw = input.trim();
  if (!raw) return "";

  // já veio E.164
  if (raw.startsWith("+")) return raw.replace(/\s+/g, "");

  const digits = onlyDigits(raw);
  if (!digits) return "";

  // se não tem DDI, assume BR
  if (digits.startsWith("55")) return `+${digits}`;
  return `+55${digits}`;
}

function isValidE164Phone(phone: string) {
  // validação simples: + e 10-15 dígitos
  return /^\+\d{10,15}$/.test(phone);
}

function isValidCNPJ14(cnpjDigits: string) {
  return /^\d{14}$/.test(cnpjDigits);
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
    cnpj: "",
    email: "",
    telefone: "",
    responsavel: "",
    funcionarios: 0,
    aceiteLgpd: false,
  });

  function update<K extends keyof EmpresaForm>(key: K, value: EmpresaForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validarFormulario(f: EmpresaForm): string | null {
    if (!f.razaoSocial.trim()) return "Informe a razão social.";

    if (!isValidCNPJ14(f.cnpj))
      return "CNPJ inválido. Use apenas números (14 dígitos).";

    if (!isValidEmail(f.email)) return "E‑mail inválido.";

    if (!isValidE164Phone(f.telefone))
      return "Telefone inválido. Use DDD e número (ex.: 11 99999-9999).";

    if (!f.responsavel.trim())
      return "Informe o responsável pelo preenchimento.";

    if (!Number.isInteger(f.funcionarios) || f.funcionarios <= 0)
      return "Número de funcionários inválido.";

    if (!f.aceiteLgpd) return "É obrigatório aceitar a LGPD.";

    return null;
  }

  async function sendOtp() {
    setOtpError(null);
    setOtpLoading(true);

    try {
      const normalized = normalizePhoneBR(form.telefone);
      if (!isValidE164Phone(normalized)) {
        throw new Error(
          "Informe um telefone válido com DDD (ex.: 11 99999-9999).",
        );
      }

      // salva telefone normalizado no form
      update("telefone", normalized);

      const { error } = await supabase.auth.signInWithOtp({
        phone: normalized,
      });

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
      const phone = form.telefone;
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

    // 1) valida form completo
    const erro = validarFormulario(form);
    if (erro) {
      setErrorMsg(erro);
      return;
    }

    // 2) exige OTP verificado
    if (!otpVerified) {
      setErrorMsg("Valide o telefone via código SMS antes de continuar.");
      return;
    }

    try {
      setState("submitting");

      const res = await fetch("/api/nr1/empresa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error ?? "Erro desconhecido");
      }

      setState("success");

      // ✅ redireciona para o wizard fora do public
      window.location.href =
        `/ativacao?tipo=empresa&origem=nr1` +
        `&cliente_id=${data.cliente_id}` +
        `&contrato_id=${data.contrato_id}` +
        `&funcionarios=${form.funcionarios}`;
    } catch (err) {
      console.error(err);
      setState("error");
      setErrorMsg("Não foi possível enviar os dados. Tente novamente.");
    }
  }

  return (
    <main className="min-h-screen bg-surface-muted">
      <div className="max-w-3xl mx-auto px-6 py-6">
        <NR1SubNav />

        {/* ================= HEADER ================= */}
        <div className="text-center">
          <Building2 size={40} className="mx-auto text-brand" />
          <h1 className="mt-4 text-3xl font-extrabold text-brand">
            Aplicação do COPSOQ II BR — NR‑1
          </h1>
          <p className="mt-4 text-slate-600">
            Preencha os dados da empresa. Em seguida, valide o telefone do
            responsável via SMS.
          </p>
        </div>

        {/* ================= FORM ================= */}
        {(state === "idle" || state === "submitting") && (
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
                  value={form.cnpj}
                  onChange={(e) =>
                    update(
                      "cnpj",
                      e.target.value.replace(/\D/g, "").slice(0, 14),
                    )
                  }
                  className="mt-1 w-full h-11 rounded-lg border border-border px-3 text-sm"
                  required
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
                  value={form.telefone}
                  onChange={(e) => {
                    // permite digitar de forma livre; vamos normalizar no sendOtp
                    update("telefone", e.target.value);
                    // mudar telefone invalida verificação anterior
                    setOtpVerified(false);
                    setOtpSent(false);
                    setOtp("");
                    setOtpError(null);
                  }}
                  className="mt-1 w-full h-11 rounded-lg border border-border px-3 text-sm"
                  placeholder="11 99999-9999"
                  required
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

            {/* Erro */}
            {errorMsg && (
              <div className="rounded-lg bg-brand-accent/10 text-brand-accent p-3 text-sm">
                {errorMsg}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={state === "submitting" || !otpVerified}
              className="w-full inline-flex items-center justify-center gap-2 h-11
                         rounded-xl bg-brand text-white font-semibold
                         hover:bg-brand-highlight transition disabled:opacity-60"
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

        {/* ================= SUCCESS ================= */}
        {state === "success" && (
          <div className="mt-10 rounded-2xl bg-surface border border-border p-8 text-center">
            <CheckCircle2 size={40} className="mx-auto text-brand-secondary" />
            <h2 className="mt-4 text-2xl font-extrabold text-brand">
              Cadastro recebido e telefone validado
            </h2>
            <p className="mt-4 text-slate-600">
              Próximo passo: contrato e pagamento. Você receberá as instruções
              por e‑mail.
            </p>
          </div>
        )}

        {/* ================= FOOTNOTE ================= */}
        <div className="mt-10 text-xs text-slate-500 text-center">
          ✔ Metodologia validada • ✔ Conformidade NR‑1 • ✔ LGPD
        </div>
      </div>
    </main>
  );
}
