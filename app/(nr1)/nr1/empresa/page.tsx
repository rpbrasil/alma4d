"use client";

import React, { useMemo, useState } from "react";
import { Mail, CheckCircle2 } from "lucide-react";
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

type Risco = "baixo" | "medio" | "alto";

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

const CNAE_RISCO_MAP: Record<string, Risco> = {
  // 🔴 ALTO
  "55": "alto",
  "56": "alto",
  "86": "alto",
  "87": "alto",
  "84": "alto",
  "49": "alto",
  "50": "alto",
  "51": "alto",

  // 🟡 MÉDIO
  "62": "medio",
  "63": "medio",
  "64": "medio",
  "65": "medio",
  "66": "medio",
  "69": "medio",
  "70": "medio",
  "73": "medio",
  "74": "medio",
  "47": "medio",
  "45": "medio",
  "46": "medio",

  // 🟢 BAIXO
  "01": "baixo",
  "02": "baixo",
  "03": "baixo",
  "05": "baixo",
  "06": "baixo",
  "07": "baixo",
  "10": "baixo",
  "11": "baixo",
  "12": "baixo",
  "13": "baixo",
  "14": "baixo",
  "15": "baixo",
};

function getRiscoByCNAE(cnae?: string): Risco {
  if (!cnae) return "medio";

  const prefix = cnae.slice(0, 2);
  return CNAE_RISCO_MAP[prefix] || "medio";
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

  const [riscoEmpresa, setRiscoEmpresa] = useState<Risco | null>(null);
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

  const [cnpjInput, setCnpjInput] = useState("");
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cnpjLoaded, setCnpjLoaded] = useState(true); //===========>> ATENCAO AQUI PARA API FUNCIONANDO - SETAR EM FALSE
  const [empresaInativa, setEmpresaInativa] = useState(false);
  const canShowForm =
    (state === "idle" || state === "submitting" || state === "error") &&
    cnpjLoaded &&
    !empresaInativa;

  async function consultarCNPJ() {
    setCnpjLoading(true);
    setErrorMsg(null);

    try {
      const digits = onlyDigits(cnpjInput);

      if (digits.length !== 14) {
        throw new Error("CNPJ inválido");
      }

      const res = await fetch("/api/cnpj/consultar", {
        method: "POST",
        body: JSON.stringify({ cnpj: digits }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      const risco = getRiscoByCNAE(data.cnae_principal);
      setRiscoEmpresa(risco);

      // ✅ preenche seu form atual
      update("razaoSocial", data.razao_social);
      update("cnpjDigits", data.cnpj);

      setCnpjLoaded(true);

      if (data.situacao_cadastral?.toLowerCase() !== "ativa") {
        setEmpresaInativa(true);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erro ao consultar CNPJ";

      setErrorMsg(message);
    } finally {
      setCnpjLoading(false);
    }
  }

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

        {/* HEADER */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-brand tracking-tight">
            NR‑1 • Avaliação Psicossocial
          </h1>

          <p className="max-w-xl mx-auto text-sm sm:text-base text-slate-600">
            Informe o CNPJ para buscar automaticamente os dados da empresa.
          </p>

          <div className="flex justify-center gap-6 text-xs text-slate-500 pt-2">
            <span>✔ Conformidade NR‑1</span>
            <span>✔ LGPD</span>
            <span>✔ Processo seguro</span>
          </div>
        </div>

        {/* ✅ STEP 1 — CNPJ */}
        <div className="mt-8 flex gap-3">
          <input
            value={formatCNPJ(cnpjInput)}
            inputMode="numeric"
            onChange={(e) => setCnpjInput(e.target.value)}
            placeholder="00.000.000/0000-00"
            className="flex-1 h-11 rounded-lg border px-3"
          />

          <button
            type="button"
            onClick={consultarCNPJ}
            disabled={cnpjLoading}
            className="px-4 bg-brand text-white rounded-lg"
          >
            {cnpjLoading ? "Buscando..." : "Buscar"}
          </button>
        </div>

        {/* 🚨 EMPRESA INATIVA */}
        {empresaInativa && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-center">
            <p className="text-red-600 font-semibold">
              ⚠️ Empresa com situação cadastral INATIVA
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Não é possível continuar com o cadastro.
            </p>
          </div>
        )}
        {riscoEmpresa && !empresaInativa && (
          <div
            className={`
      mt-4 p-4 rounded-xl border text-center transition-all
      ${
        riscoEmpresa === "alto"
          ? "bg-red-50 border-red-200"
          : riscoEmpresa === "medio"
            ? "bg-yellow-50 border-yellow-200"
            : "bg-green-50 border-green-200"
      }
    `}
          >
            <p className="text-xs text-slate-500 uppercase tracking-wide">
              Classificação automática
            </p>

            <p className="text-lg font-bold mt-1">
              {riscoEmpresa === "alto" && "🔴 Alto risco psicossocial"}
              {riscoEmpresa === "medio" && "🟡 Médio risco psicossocial"}
              {riscoEmpresa === "baixo" && "🟢 Baixo risco psicossocial"}
            </p>

            <p className="text-xs text-slate-500 mt-2">
              Baseado na atividade econômica (CNAE)
            </p>

            {/* 💡 UX inteligente */}
            {riscoEmpresa === "alto" && (
              <p className="text-xs text-red-600 mt-2 font-semibold">
                Recomendamos atenção especial aos fatores psicossociais desta
                atividade.
              </p>
            )}
          </div>
        )}
        {/* ✅ FORM */}
        {canShowForm && (
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
                className="mt-1 w-full h-11 rounded-lg border px-3 text-sm"
                required
              />
            </div>

            {/* CNPJ + Funcionários */}
            <div className="grid sm:grid-cols-2 gap-4">
              <input
                value={formatCNPJ(form.cnpjDigits)}
                disabled
                className="h-11 border rounded-lg px-3 bg-gray-100"
              />

              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={form.funcionarios || ""}
                onChange={(e) => update("funcionarios", Number(e.target.value))}
                className="h-11 border rounded-lg px-3"
                placeholder="Nº funcionários"
                required
              />
            </div>

            {/* Responsável */}
            <input
              value={form.responsavel}
              onChange={(e) => update("responsavel", e.target.value)}
              placeholder="Responsável"
              className="h-11 border rounded-lg px-3 w-full"
              required
            />

            {/* Email */}
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className="pl-9 h-11 border rounded-lg px-3 w-full"
                placeholder="E-mail"
                required
              />
            </div>

            {/* TELEFONE / OTP */}
            <div className="p-4 border rounded-xl space-y-3">
              <input
                value={formatPhoneBR(form.telefoneRaw)}
                onChange={(e) => {
                  update("telefoneRaw", e.target.value);
                  update("telefoneE164", "");
                  setOtpVerified(false);
                  setOtpSent(false);
                  setOtp("");
                }}
                placeholder="Telefone"
                className="h-11 border rounded-lg px-3 w-full"
              />

              {!otpSent ? (
                <button
                  type="button"
                  onClick={sendOtp}
                  disabled={otpLoading}
                  className="h-11 px-4 rounded-xl bg-brand text-white font-semibold"
                >
                  Enviar código
                </button>
              ) : (
                <>
                  <input
                    value={otp}
                    onChange={(e) => setOtp(onlyDigits(e.target.value))}
                    placeholder="Código"
                    className="h-11 border rounded-lg px-3 w-full"
                  />

                  <button type="button" onClick={verifyOtp}>
                    Validar
                  </button>
                </>
              )}
            </div>
            {otpError && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 text-sm rounded-lg">
                {otpError}
              </div>
            )}
            {/* LGPD */}
            <label className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.aceiteLgpd}
                onChange={(e) => update("aceiteLgpd", e.target.checked)}
              />
              Aceito LGPD
            </label>

            {/* ERRO */}
            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 text-sm rounded-lg">
                {errorMsg}
              </div>
            )}

            {/* CTA */}
            <button
              type="submit"
              disabled={state === "submitting" || !otpVerified}
              className="w-full h-11 bg-brand text-white rounded-xl"
            >
              {state === "submitting" ? "Enviando..." : "Continuar"}
            </button>
          </form>
        )}

        {/* SUCCESS */}
        {state === "success" && (
          <div className="mt-10 text-center">
            <CheckCircle2 className="mx-auto text-brand-secondary" size={40} />
            <h2 className="mt-4 text-xl font-bold text-brand">
              Cadastro realizado
            </h2>
          </div>
        )}

        {/* FOOTER */}
        <div className="mt-10 text-xs text-slate-500 text-center">
          ✔ Metodologia validada • ✔ Conformidade NR‑1 • ✔ LGPD
        </div>
      </div>
    </main>
  );
}
