"use client";

import React, { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Mail, CheckCircle2 } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

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

/**
 * Mapeamento baseado na NR-4 (Quadro I)
 * Consideramos:
 * - BAIXO: Grau de Risco 1 e 2
 * - MÉDIO: Grau de Risco 3
 * - ALTO:  Grau de Risco 4
 */
const CNAE_RISCO_MAP: Record<string, Risco> = {
  // 🟢 BAIXO (GR 1 e 2) - Setores Administrativos, Financeiros e Comércio Geral
  "62": "baixo", // TI e Software
  "63": "baixo", // Prestação de serviços de informação
  "64": "baixo", // Atividades financeiras
  "65": "baixo", // Seguros e Previdência
  "66": "baixo", // Atividades auxiliares financeiras
  "69": "baixo", // Jurídico e Contabilidade
  "70": "baixo", // Sedes de empresas e consultoria
  "73": "baixo", // Publicidade e Pesquisa de mercado
  "85": "baixo", // Educação
  "45": "baixo", // Comércio de veículos (maioria GR 2)
  "46": "baixo", // Comércio atacadista (maioria GR 2)
  "47": "baixo", // Comércio varejista (maioria GR 2)
  "55": "baixo", // Hotéis e Alojamento (GR 2)
  "56": "baixo", // Restaurantes e Bares (GR 2)

  // 🟡 MÉDIO (GR 3) - Indústria, Saúde e Logística Pesada
  "01": "medio", // Agricultura (maioria GR 3)
  "10": "medio", // Fabricação de alimentos
  "13": "medio", // Têxtil
  "14": "medio", // Vestuário
  "15": "medio", // Couro e Calçados
  "49": "medio", // Transporte Terrestre (Cargas/Passageiros)
  "50": "medio", // Transporte Aquaviário
  "51": "medio", // Transporte Aéreo
  "86": "medio", // Atividades de atenção à saúde humana (Hospitais)
  "87": "medio", // Assistência social com internação

  // 🔴 ALTO (GR 4) - Mineração, Construção Pesada e Indústria Química
  "05": "alto", // Extração de Carvão
  "06": "alto", // Extração de Petróleo
  "07": "alto", // Extração de Minerais Metálicos
  "08": "alto", // Extração de Minerais não-metálicos
  "12": "alto", // Fabricação de produtos do fumo
  "16": "alto", // Madeira (Serrarias costumam ser GR 4)
  "41": "alto", // Construção de edifícios
  "42": "alto", // Obras de infraestrutura
  "43": "alto", // Serviços especializados para construção
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
  const [otpPhone, setOtpPhone] = useState("");
  const [resendIn, setResendIn] = useState(0);

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
  const [empresaInativa, setEmpresaInativa] = useState(false);
  const [mostrarRisco, setMostrarRisco] = useState(false);
  const [cnpjSucesso, setCnpjSucesso] = useState(false);
  const canShowForm =
    (state === "idle" || state === "submitting" || state === "error") &&
    cnpjSucesso &&
    !empresaInativa;

  useEffect(() => {
    if (!mostrarRisco) return;

    const timer = setTimeout(() => {
      setMostrarRisco(false);
    }, 6000);

    return () => clearTimeout(timer);
  }, [mostrarRisco]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

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
      setMostrarRisco(true);

      // ✅ preenche seu form atual
      update("razaoSocial", data.razao_social);
      update("cnpjDigits", data.cnpj);
      setCnpjSucesso(true);

      if (data.situacao_cadastral?.toLowerCase() !== "ativa") {
        setEmpresaInativa(true);
        setCnpjSucesso(false);
      }
    } catch (err: unknown) {
      setCnpjSucesso(false);
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

      // trava o telefone exatamente usado no envio
      setOtpPhone(e164);
      update("telefoneE164", e164);

      // limpa estado de verificação anterior
      setOtp("");
      setOtpVerified(false);

      const { error } = await supabase.auth.signInWithOtp({
        phone: e164,
        options: { channel: "sms", shouldCreateUser: true },
      });

      if (error) throw new Error(error.message);

      setOtpSent(true);

      // evita reenviar em sequência (reenviar gera novo token e invalida o anterior)
      setResendIn(60);
    } catch (e: unknown) {
      setOtpSent(false);
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
      const phoneLocked = otpPhone || normalizePhoneBRToE164(form.telefoneRaw);

      if (!isValidE164Phone(phoneLocked)) {
        throw new Error("Telefone inválido.");
      }

      const token = onlyDigits(otp).trim();
      if (token.length !== 6) {
        throw new Error("Informe o código de 6 dígitos.");
      }

      // compatibilidade: verifyOtp frequentemente normaliza removendo '+'
      const phoneForVerify = phoneLocked.startsWith("+")
        ? phoneLocked.slice(1)
        : phoneLocked;

      const { data, error } = await supabase.auth.verifyOtp({
        phone: phoneForVerify,
        token,
        type: "sms",
      });

      if (error) throw new Error(error.message);
      if (!data?.user)
        throw new Error("Não foi possível autenticar o usuário.");

      setOtpVerified(true);
      setOtpError(null);
    } catch (e: unknown) {
      setOtpVerified(false);
      setOtpError(
        e instanceof Error ? e.message : "Código inválido ou expirado.",
      );
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
        <div className="mb-6">
          <Link
            href="/nr1/mapeamento-riscos-psicossociais"
            className="inline-flex items-center gap-3 text-sm text-slate-500 hover:text-brand transition"
          >
            <Image
              src="/images/alma4d_express_nobground.png"
              alt="alma4D"
              width={48}
              height={48}
              className="opacity-90"
              priority
            />
            ← Voltar para NR‑1 Home
          </Link>
        </div>
        {/* HEADER */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-brand tracking-tight">
            NR‑1 • Empresas
          </h1>
          {!cnpjSucesso && (
            <p className="max-w-xl mx-auto text-sm sm:text-base text-slate-600">
              Informe o CNPJ para buscar automaticamente os dados da empresa.
            </p>
          )}

          <div className="flex justify-center gap-6 text-xs text-slate-500 pt-2">
            <span>✔ Conformidade NR‑1</span>
            <span>✔ LGPD</span>
            <span>✔ Processo seguro</span>
          </div>
        </div>

        {/* ✅ STEP 1 — CNPJ */}
        <div className="mt-8 flex flex-col lg:flex-row items-start gap-4">
          {/* 🔹 CNPJ + BOTÃO */}
          <div className="flex gap-3 w-full lg:w-auto flex-1">
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
              className="h-11 px-4 bg-brand text-white rounded-lg"
            >
              {cnpjLoading ? "Buscando..." : "Buscar"}
            </button>
          </div>

          {/* 🔹 RISCO AO LADO */}
          {riscoEmpresa && !empresaInativa && (
            <div
              className={`
        flex items-center h-11 px-4 rounded-lg border text-sm whitespace-nowrap
        ${
          riscoEmpresa === "alto"
            ? "bg-red-50 border-red-200 text-red-600"
            : riscoEmpresa === "medio"
              ? "bg-yellow-50 border-yellow-200 text-yellow-700"
              : "bg-green-50 border-green-200 text-green-700"
        }
      `}
            >
              {riscoEmpresa === "alto" && "🔴 Alto risco"}
              {riscoEmpresa === "medio" && "🟡 Médio risco"}
              {riscoEmpresa === "baixo" && "🟢 Baixo risco"}
            </div>
          )}
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
        {mostrarRisco && riscoEmpresa && !empresaInativa && (
          <div
            className={`mt-4 p-4 rounded-xl border text-center transition-all duration-500 ${mostrarRisco ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}  ${
              riscoEmpresa === "alto"
                ? "bg-red-50 border-red-200"
                : riscoEmpresa === "medio"
                  ? "bg-yellow-50 border-yellow-200"
                  : "bg-green-50 border-green-200"
            }`}
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
              Estimativa baseada na NR-4 | atividade econômica (CNAE)
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
                className="mt-1 w-full h-11 rounded-lg border px-3 text-sm bg-gray-100 cursor-not-allowed"
                disabled
              />
            </div>

            {/* CNPJ + Funcionários */}
            <div className="grid sm:grid-cols-2 gap-4">
              <input
                value={formatCNPJ(form.cnpjDigits)}
                disabled
                className="h-11 border rounded-lg px-3 cursor-not-allowed bg-gray-100"
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

            {/* TELEFONE / OTP — UI alinhada à paleta oficial */}
            <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">
                  Telefone
                </label>

                <input
                  value={formatPhoneBR(form.telefoneRaw)}
                  onChange={(e) => {
                    update("telefoneRaw", e.target.value);
                    update("telefoneE164", "");
                    setOtpPhone("");
                    setOtpVerified(false);
                    setOtpSent(false);
                    setOtp("");
                    setOtpError(null);
                    setResendIn(0);
                  }}
                  placeholder="(11) 99999-9999"
                  className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none
                 focus:ring-2 focus:ring-brand-highlight/25"
                />

                <p className="text-xs text-slate-500">
                  Enviaremos um código por SMS para confirmar o número.
                </p>
              </div>

              {!otpSent ? (
                <button
                  type="button"
                  onClick={sendOtp}
                  disabled={otpLoading}
                  className="h-11 w-full rounded-xl bg-brand text-white font-semibold
                 disabled:opacity-60 disabled:cursor-not-allowed
                 hover:brightness-95 active:brightness-90"
                >
                  {otpLoading ? "Enviando..." : "Enviar código"}
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-slate-700">
                      Digite o código SMS
                    </p>

                    {otpVerified ? (
                      <span
                        className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold
                           border border-brand-secondary/20 bg-brand-secondary/10 text-brand-secondary"
                      >
                        <CheckCircle2 size={14} />
                        Telefone validado
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500 truncate">
                        {otpPhone
                          ? `Enviado para ${otpPhone}`
                          : "Código enviado"}
                      </span>
                    )}
                  </div>

                  <input
                    value={otp}
                    onChange={(e) =>
                      setOtp(onlyDigits(e.target.value).slice(0, 6))
                    }
                    placeholder="000000"
                    inputMode="numeric"
                    className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm tracking-widest text-center
                   outline-none focus:ring-2 focus:ring-brand-highlight/25"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    {/* Validar (primário) */}
                    <button
                      type="button"
                      onClick={verifyOtp}
                      disabled={otpLoading || otpVerified}
                      className="h-11 rounded-xl bg-brand text-white font-semibold
                     disabled:opacity-60 disabled:cursor-not-allowed
                     hover:brightness-95 active:brightness-90"
                    >
                      {otpLoading
                        ? "Validando..."
                        : otpVerified
                          ? "Validado"
                          : "Validar"}
                    </button>

                    {/* Reenviar (secundário) */}
                    <button
                      type="button"
                      onClick={sendOtp}
                      disabled={otpLoading || resendIn > 0}
                      className="h-11 rounded-xl border border-border bg-white font-semibold text-brand
                     disabled:opacity-60 disabled:cursor-not-allowed
                     hover:bg-surface-muted active:bg-surface-muted/70"
                    >
                      {resendIn > 0 ? `Reenviar em ${resendIn}s` : "Reenviar"}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp("");
                      setOtpError(null);
                      setOtpVerified(false);
                      setResendIn(0);
                      setOtpPhone("");
                    }}
                    className="w-full text-xs text-slate-500 hover:text-brand"
                  >
                    Trocar número
                  </button>
                </div>
              )}

              {otpError && (
                <div className="rounded-xl border border-brand-accent/25 bg-brand-accent/10 p-3 text-sm text-brand-accent">
                  {otpError}
                  <div className="mt-1 text-xs text-brand-accent/90">
                    Se você clicou em “Reenviar”, use sempre o último código
                    recebido.
                  </div>
                </div>
              )}
            </div>

            {/* LGPD */}
            <label className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.aceiteLgpd}
                onChange={(e) => update("aceiteLgpd", e.target.checked)}
              />
              Aceito todas as clausulas da LGPD
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
              className={`
    w-full h-11 rounded-xl font-semibold transition-all
    ${
      state === "submitting"
        ? "bg-brand text-white opacity-70 cursor-wait"
        : otpVerified
          ? "bg-brand text-white hover:brightness-95 active:brightness-90"
          : "bg-border text-slate-400 cursor-not-allowed"
    }
            `}
            >
              {state === "submitting"
                ? "Enviando..."
                : !otpVerified
                  ? "Valide o telefone para continuar"
                  : "Continuar"}
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
