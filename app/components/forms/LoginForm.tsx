"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type Method = "phone" | "email";

export function LoginForm() {
  const router = useRouter();

  // método
  const [method, setMethod] = useState<Method>("phone");

  // estado geral
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // phone
  const [country, setCountry] = useState("+55"); // editável
  const [phoneLocal, setPhoneLocal] = useState(""); // só número
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  // email
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // refs p/ foco
  const phoneRef = useRef<HTMLInputElement>(null);
  const otpRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // foco automático por método/etapa
  useEffect(() => {
    if (method === "phone") {
      if (!otpSent) phoneRef.current?.focus();
      else otpRef.current?.focus();
    } else {
      emailRef.current?.focus();
    }
  }, [method, otpSent]);

  /* ===========================
     PHONE OTP
  =========================== */

  const fullPhone = `${country}${phoneLocal.replace(/\D/g, "")}`;

  async function sendOtp() {
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });

    setLoading(false);

    if (error) {
      setError("Não foi possível enviar o código. Verifique o número.");
      return;
    }

    setOtpSent(true);
  }

  async function verifyOtp() {
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.verifyOtp({
      phone: fullPhone,
      token: otp,
      type: "sms",
    });

    setLoading(false);

    if (error) {
      setError("Código inválido ou expirado. Solicite um novo.");
      return;
    }

    router.push("/dashboard");
  }

  /* ===========================
     EMAIL + SENHA
  =========================== */

  async function handleEmail() {
    setError(null);

    if (!email || !password) {
      setError("Informe email e senha para continuar.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError("Email ou senha inválidos.");
      return;
    }

    router.push("/dashboard");
  }

  /* ===========================
     RENDER
  =========================== */

  return (
    <div className="space-y-6">
      {/* Escolha do método */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">
          Escolha como deseja entrar
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMethod("phone")}
            aria-pressed={method === "phone"}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
              method === "phone" ? "bg-surface-muted font-semibold" : ""
            }`}
          >
            📱 Telefone
          </button>
          <button
            type="button"
            onClick={() => setMethod("email")}
            aria-pressed={method === "email"}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
              method === "email" ? "bg-surface-muted font-semibold" : ""
            }`}
          >
            📧 Email
          </button>
        </div>
      </div>

      {/* Erro orientador */}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* PHONE */}
      {method === "phone" && (
        <div className="space-y-3">
          {/* Etapa */}
          <p className="text-xs text-foreground/60">
            {otpSent
              ? "Passo 2 de 2 • Digite o código recebido por SMS"
              : "Passo 1 de 2 • Informe seu telefone"}
          </p>

          {/* Telefone com prefixo ancorado */}
          <div className="flex">
            <button
              type="button"
              onClick={() => setCountry(country === "+55" ? "+1" : "+55")}
              title="Alterar país"
              className="rounded-l-lg border border-r-0 px-3 text-sm bg-surface-muted"
            >
              {country}
            </button>
            <input
              ref={phoneRef}
              type="tel"
              inputMode="numeric"
              placeholder="11 99999-9999"
              value={phoneLocal}
              onChange={(e) => setPhoneLocal(e.target.value)}
              className="w-full rounded-r-lg border px-3 py-2"
              aria-label="Telefone"
              disabled={otpSent}
            />
          </div>

          {/* OTP */}
          {otpSent && (
            <input
              ref={otpRef}
              type="text"
              inputMode="numeric"
              placeholder="Código de 6 dígitos"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
              aria-label="Código SMS"
            />
          )}

          {/* Ações */}
          {!otpSent ? (
            <button
              onClick={sendOtp}
              disabled={loading || phoneLocal.length < 8}
              className="w-full rounded-lg bg-brand-primary py-2 text-white"
            >
              {loading ? "Enviando..." : "Receber código por SMS"}
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={verifyOtp}
                disabled={loading || otp.length < 4}
                className="flex-1 rounded-lg bg-brand-primary py-2 text-white"
              >
                {loading ? "Verificando..." : "Confirmar acesso"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOtp("");
                  setOtpSent(false);
                }}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                Enviar novamente
              </button>
            </div>
          )}

          <p className="text-xs text-foreground/60">
            Usaremos seu telefone apenas para autenticação.
          </p>
        </div>
      )}

      {/* EMAIL */}
      {method === "email" && (
        <div className="space-y-3">
          <input
            ref={emailRef}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border px-3 py-2"
            aria-label="Email"
          />
          <input
            ref={passwordRef}
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleEmail()}
            className="w-full rounded-lg border px-3 py-2"
          />

          <button
            onClick={handleEmail}
            disabled={loading}
            className={`w-full rounded-lg py-2 text-white ${
              loading
                ? "bg-brand-primary/70 cursor-not-allowed"
                : "bg-brand-primary hover:opacity-90"
            }`}
          >
            {loading ? "Entrando..." : "Entrar no painel"}
          </button>
          <p className="text-xs text-foreground/60">
            Acesso restrito para usuários autorizados.
          </p>
        </div>
      )}
    </div>
  );
}
