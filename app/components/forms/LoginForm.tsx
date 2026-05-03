"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

function formatPhoneBR(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}
function extractDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function LoginForm() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [country, setCountry] = useState("+55");
  const [phoneFormatted, setPhoneFormatted] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const phoneRef = useRef<HTMLInputElement>(null);
  const otpRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!otpSent) phoneRef.current?.focus();
    else otpRef.current?.focus();
  }, [otpSent]);

  const fullPhone = `${country}${extractDigits(phoneFormatted)}`;
  const isPhoneValid = extractDigits(phoneFormatted).length >= 10;

  const handlePhoneChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPhoneFormatted(formatPhoneBR(e.target.value));
      if (error) setError(null);
    },
    [error],
  );

  async function sendOtp() {
    setError(null);
    setSuccess(null);
    if (!isPhoneValid) {
      setError("Informe um telefone válido com DDD (10–11 dígitos).");
      return;
    }
    if (loading) return;
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: fullPhone,
        options: { shouldCreateUser: true },
      });
      if (error) {
        setError(error.message || "Não foi possível enviar o código.");
        return;
      }
      setOtpSent(true);
      setSuccess("Código enviado por SMS.");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro inesperado ao enviar código.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setError(null);
    setSuccess(null);
    if (otp.length < 6) {
      setError("Digite o código de 6 dígitos.");
      return;
    }
    if (loading) return;
    setLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: fullPhone,
        token: otp.trim(),
        type: "sms",
      });
      
      if (error) {
        setError(error.message || "Código inválido ou expirado.");
        return;
      }

      setSuccess("Acesso confirmado. Redirecionando…");
      await new Promise((r) => setTimeout(r, 450));
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Erro ao verificar código.",
      );
    } finally {
      setLoading(false);
    }
  }

  function backToPhone() {
    setOtp("");
    setOtpSent(false);
    setError(null);
    setSuccess(null);
  }

  // estilos reusáveis (compactos e consistentes)
  const fieldWrap =
    "rounded-xl border border-border bg-surface focus-within:ring-2 focus-within:ring-brand-secondary/40";
  const inputBase =
    "w-full h-10 px-3 bg-transparent text-foreground placeholder:text-foreground/35 outline-none";
  const btnPrimary =
    "h-10 w-full rounded-xl bg-brand text-white font-medium transition hover:opacity-95 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed";
  const btnGhost =
    "h-10 rounded-xl border border-border text-foreground/80 font-medium transition hover:bg-surface-muted disabled:opacity-50 disabled:cursor-not-allowed";
  const link =
    "text-sm text-brand-secondary hover:opacity-80 transition underline underline-offset-4 decoration-brand-secondary/30";

  return (
    <div className="w-full flex items-start justify-center px-4 py-5 sm:py-7">
      <div className="absolute inset-0 -z-10 bg-linear-to-b from-background to-surface-muted/40" />
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border bg-surface/90 backdrop-blur shadow-sm">
          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center gap-3">
                {/* <h1 className="text-base sm:text-lg font-semibold text-foreground leading-tight">
                  {otpSent ? "Confirmar acesso" : "Entrar"}
                </h1> */}
              </div>
            </div>
            {(error || success) && (
              <div className="mt-3 space-y-2">
                {error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-border bg-surface-muted px-3 py-2 text-sm text-foreground flex gap-2"
                  >
                    <span className="mt-3px inline-block h-2 w-2 rounded-full bg-brand-accent" />
                    <span className="leading-snug">{error}</span>
                  </div>
                )}

                {success && (
                  <div
                    role="status"
                    className="rounded-xl border border-border bg-surface-muted px-3 py-2 text-sm text-foreground flex gap-2"
                  >
                    <span className="mt-3px inline-block h-2 w-2 rounded-full bg-brand-secondary" />
                    <span className="leading-snug">{success}</span>
                  </div>
                )}
              </div>
            )}

            {/* corpo */}
            <div className="mt-3 space-y-3">
              {!otpSent ? (
                <>
                  {/* telefone */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="phone-input"
                      className="text-sm font-medium text-foreground"
                    >
                      Celular
                    </label>

                    <div className={fieldWrap}>
                      <div className="flex">
                        <select
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          disabled={loading}
                          className="h-10 px-2.5 bg-surface-muted text-sm font-medium text-foreground border-0 border-r border-border outline-none rounded-l-xl"
                          aria-label="País"
                        >
                          <option value="+55">+55</option>
                          <option value="+1">+1</option>
                        </select>

                        <input
                          ref={phoneRef}
                          id="phone-input"
                          type="tel"
                          inputMode="numeric"
                          placeholder="(11) 99999-9999"
                          value={phoneFormatted}
                          onChange={handlePhoneChange}
                          disabled={loading}
                          className={`${inputBase} rounded-r-xl`}
                          aria-label="Número de telefone"
                        />
                      </div>
                    </div>

                    <p className="text-[11px] text-foreground/50 leading-snug">
                      Você receberá um código de 6 dígitos por SMS.
                    </p>
                  </div>

                  <button
                    onClick={sendOtp}
                    disabled={!isPhoneValid || loading}
                    className={btnPrimary}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Enviando…
                      </span>
                    ) : (
                      "Enviar código"
                    )}
                  </button>
                </>
              ) : (
                <>
                  {/* otp */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="otp-input"
                      className="text-sm font-medium text-foreground"
                    >
                      Código SMS
                    </label>

                    <div className={fieldWrap}>
                      <input
                        ref={otpRef}
                        id="otp-input"
                        type="text"
                        inputMode="numeric"
                        placeholder="000000"
                        value={otp}
                        onChange={(e) => {
                          const digits = e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 6);
                          setOtp(digits);
                          if (error) setError(null);
                        }}
                        disabled={loading}
                        maxLength={6}
                        className={`${inputBase} text-center font-mono text-base tracking-[0.25em]`}
                        aria-label="Código de 6 dígitos"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={sendOtp}
                        disabled={loading}
                        className={link}
                      >
                        Reenviar
                      </button>
                      <button
                        type="button"
                        onClick={backToPhone}
                        disabled={loading}
                        className={link}
                      >
                        Trocar número
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={verifyOtp}
                      disabled={otp.length < 6 || loading}
                      className={`${btnPrimary} flex-1`}
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Verificando…
                        </span>
                      ) : (
                        "Confirmar"
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={backToPhone}
                      disabled={loading}
                      className={`${btnGhost} px-3`}
                    >
                      Voltar
                    </button>
                  </div>
                </>
              )}

              {/* rodapé 1 linha (bem compacto) */}
              <p className="text-[11px] text-center text-foreground/45 leading-snug">
                Seus dados são protegidos e usados apenas para verificação.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
