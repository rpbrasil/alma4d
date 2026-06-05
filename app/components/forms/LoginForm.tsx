"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

type AuthMethod = "sms" | "email";

function formatPhoneBR(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

function extractDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

function isValidEmail(email: string): boolean {
  const s = email.trim();
  if (s.length < 6) return false;
  return /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(s);
}

function maskEmail(email: string): string {
  const s = email.trim();
  const [local, domain] = s.split("@");
  if (!local || !domain) return s;
  if (local.length <= 2) return `${local[0] ?? "*"}***@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}

const EXPRESS_BASIC_ROUTE = "/dashboard/express/acesso-basico";

export function LoginForm() {
  const supabase = getSupabaseClient();

  const [authMethod, setAuthMethod] = useState<AuthMethod>("sms");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Travado em BR por enquanto, porque toda a regra atual é BR
  const country = "+55";
  const [phoneFormatted, setPhoneFormatted] = useState("");
  const [email, setEmail] = useState("");

  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpTarget, setOtpTarget] = useState("");

  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const otpRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (otpSent) {
      otpRef.current?.focus();
      return;
    }

    if (authMethod === "sms") {
      phoneRef.current?.focus();
    } else {
      emailRef.current?.focus();
    }
  }, [otpSent, authMethod]);

  const fullPhone = `${country}${extractDigits(phoneFormatted)}`;
  const isPhoneValid = extractDigits(phoneFormatted).length >= 10;
  const isEmailValid = isValidEmail(email);

  const handlePhoneChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPhoneFormatted(formatPhoneBR(e.target.value));
      if (error) setError(null);
    },
    [error],
  );

  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEmail(e.target.value);
      if (error) setError(null);
    },
    [error],
  );

  const resetOtpFlow = useCallback(() => {
    setOtp("");
    setOtpSent(false);
    setOtpTarget("");
    setError(null);
    setSuccess(null);
  }, []);

  function changeMethod(method: AuthMethod) {
    if (loading) return;
    setAuthMethod(method);
    resetOtpFlow();
  }

  async function sendOtp() {
    setError(null);
    setSuccess(null);

    if (authMethod === "sms" && !isPhoneValid) {
      setError("Informe um telefone válido com DDD (10–11 dígitos).");
      return;
    }

    if (authMethod === "email" && !isEmailValid) {
      setError("Informe um e-mail válido.");
      return;
    }

    if (loading) return;
    setLoading(true);

    try {
      if (authMethod === "sms") {
        const { error } = await supabase.auth.signInWithOtp({
          phone: fullPhone,
          options: {
            shouldCreateUser: true,
          },
        });

        if (error) {
          setLoading(false);
          setError(error.message || "Não foi possível enviar o código.");
          return;
        }

        setOtpTarget(fullPhone);
        setOtpSent(true);
        setSuccess("Código enviado por SMS.");
        setLoading(false);
        return;
      }

      const emailTrimmed = email.trim();

      const { error } = await supabase.auth.signInWithOtp({
        email: emailTrimmed,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        setLoading(false);
        setError(error.message || "Não foi possível enviar o código.");
        return;
      }

      setOtpTarget(emailTrimmed);
      setOtpSent(true);
      setSuccess("Código enviado por e-mail.");
      setLoading(false);
    } catch (err: unknown) {
      setLoading(false);
      setError(
        err instanceof Error
          ? err.message
          : "Erro inesperado ao enviar código.",
      );
    }
  }

  async function verifyOtp() {
    setError(null);
    setSuccess(null);

    if (otp.trim().length < 6) {
      setError("Digite o código de 6 dígitos.");
      return;
    }

    if (loading) return;
    setLoading(true);

    try {
      let session:
        | {
            access_token: string;
            refresh_token: string;
            user: { id?: string | null };
          }
        | null
        | undefined = null;

      if (authMethod === "sms") {
        const { data, error } = await supabase.auth.verifyOtp({
          phone: fullPhone,
          token: otp.trim(),
          type: "sms",
        });

        if (error || !data?.session) {
          setError(error?.message || "Código inválido ou expirado.");
          return;
        }

        session = data.session;
      } else {
        const emailTrimmed = email.trim();

        const { data, error } = await supabase.auth.verifyOtp({
          email: emailTrimmed,
          token: otp.trim(),
          type: "email",
        });

        if (error || !data?.session) {
          setError(error?.message || "Código inválido ou expirado.");
          return;
        }

        session = data.session;
      }

      await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });

      const bootstrapRes = await fetch("/api/auth/bootstrap", {
        method: "POST",
        credentials: "include",
      });

      if (!bootstrapRes.ok) {
        const bootstrapText = await bootstrapRes.text();
        await supabase.auth.signOut();
        setError(`Falha no bootstrap: ${bootstrapText}`);
        return;
      }

      const { data: refreshed, error: refreshErr } =
        await supabase.auth.refreshSession();

      if (refreshErr) {
        await supabase.auth.signOut();
        setError(`Falha ao atualizar sessão: ${refreshErr.message}`);
        return;
      }

      // usa o usuário da sessão atualizada; fallback para getUser
      const user =
        refreshed?.session?.user ?? (await supabase.auth.getUser()).data.user;

      if (!user?.id) {
        await supabase.auth.signOut();
        setError("Usuário inválido.");
        return;
      }

      // ✅ resolve o usuario_id canônico
      const { data: usuarioId, error: usuarioIdErr } =
        await supabase.rpc("current_usuario_id");

      if (usuarioIdErr) {
        await supabase.auth.signOut();
        setError(`Erro ao resolver identidade: ${usuarioIdErr.message}`);
        return;
      }

      if (!usuarioId) {
        await supabase.auth.signOut();
        setError("Usuário não vinculado.");
        return;
      }

      // ✅ agora usa o usuario correto
      const { data: perfil, error: perfilErr } = await supabase
        .from("usuarios")
        .select("ativo, tipo_plano, cliente_id, role")
        .eq("id", usuarioId)
        .maybeSingle();

      if (perfilErr) {
        await supabase.auth.signOut();
        setError(`Falha ao carregar perfil: ${perfilErr.message}`);
        return;
      }

      if (!perfil) {
        await supabase.auth.signOut();
        setError("Usuário não cadastrado.");
        return;
      }

      if (perfil.ativo === false) {
        await supabase.auth.signOut();
        setError("Usuário inativo.");
        return;
      }

      const role = (perfil.role ?? "").toLowerCase().trim();
      const plano = (perfil.tipo_plano ?? "").toLowerCase().trim();

      const params = new URLSearchParams(window.location.search);
      const redirectParam = params.get("redirect");
      const linkId = params.get("linkId");

      if (role.includes("admin")) {
        setSuccess("Acesso confirmado. Redirecionando…");
        window.location.replace("/dashboard/admin/clientes");
        return;
      }

      const isTenantRole =
        role.includes("cliente") ||
        role.includes("gestor") ||
        role.includes("usuario");

      if (!isTenantRole) {
        await supabase.auth.signOut();
        setError("Perfil de acesso inválido.");
        return;
      }

      const basePath = plano.includes("express")
        ? "/dashboard/express"
        : plano.includes("premium")
          ? "/dashboard/premium"
          : null;

      if (!basePath) {
        await supabase.auth.signOut();
        setError("Plano não configurado.");
        return;
      }

      if (!perfil.cliente_id) {
        await supabase.auth.signOut();
        setError("Cliente não vinculado.");
        return;
      }

      const { data: cliente, error: clienteErr } = await supabase
        .from("clientes")
        .select("ativo")
        .eq("id", perfil.cliente_id)
        .maybeSingle();

      if (clienteErr) {
        await supabase.auth.signOut();
        setError("Falha ao validar cliente.");
        return;
      }

      if (!cliente || cliente.ativo === false) {
        await supabase.auth.signOut();
        setError("Cliente inativo.");
        return;
      }
      let finalRedirect: string | null = null;
      console.log("[LoginForm] usuarioId:", usuarioId);
      console.log("[LoginForm] perfil:", perfil);
      console.log("[LoginForm] redirect final:", finalRedirect);

      if (redirectParam && redirectParam.startsWith(basePath)) {
        finalRedirect = redirectParam;
      } else if (
        plano === "express" &&
        (role.includes("usuario") || role.includes("gestor"))
      ) {
        if (!linkId) {
          finalRedirect = EXPRESS_BASIC_ROUTE;
        } else {
          finalRedirect = `${basePath}/copsoq?linkId=${encodeURIComponent(linkId)}`;
        }
      } else {
        finalRedirect = basePath;
      }
      console.log("ROLE:", role);
      console.log("PLANO:", plano);
      if (!finalRedirect) {
        await supabase.auth.signOut();
        setError("Erro interno de navegação.");
        return;
      }

      setSuccess("Acesso confirmado. Redirecionando…");
      window.location.replace(finalRedirect);
    } catch (err) {
      await supabase.auth.signOut();
      setError(
        "Erro ao verificar código. " +
          (err instanceof Error ? err.message : ""),
      );
    } finally {
      setLoading(false);
    }
  }

  function backToStart() {
    resetOtpFlow();
  }

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
                {/* título opcional */}
              </div>
            </div>

            {(error || success) && (
              <div className="mt-3 space-y-2">
                {error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-border bg-surface-muted px-3 py-2 text-sm text-foreground flex gap-2"
                  >
                    <span className="mt-1.5 inline-block h-2 w-2 rounded-full bg-brand-accent" />
                    <span className="leading-snug">{error}</span>
                  </div>
                )}

                {success && (
                  <div
                    role="status"
                    className="rounded-xl border border-border bg-surface-muted px-3 py-2 text-sm text-foreground flex gap-2"
                  >
                    <span className="mt-1.5 inline-block h-2 w-2 rounded-full bg-brand-secondary" />
                    <span className="leading-snug">{success}</span>
                  </div>
                )}
              </div>
            )}

            <div className="mt-3 space-y-3">
              {!otpSent ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Método de acesso
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => changeMethod("sms")}
                        disabled={loading}
                        className={`h-10 rounded-xl border text-sm font-medium transition ${
                          authMethod === "sms"
                            ? "border-brand bg-brand-secondary text-white"
                            : "border-border bg-surface text-foreground hover:bg-surface-muted"
                        }`}
                      >
                        SMS
                      </button>

                      <button
                        type="button"
                        onClick={() => changeMethod("email")}
                        disabled={loading}
                        className={`h-10 rounded-xl border text-sm font-medium transition ${
                          authMethod === "email"
                            ? "border-brand bg-brand-secondary text-white"
                            : "border-border bg-surface text-foreground hover:bg-surface-muted"
                        }`}
                      >
                        E-mail
                      </button>
                    </div>
                  </div>

                  {authMethod === "sms" ? (
                    <div className="space-y-1.5">
                      <label
                        htmlFor="phone-input"
                        className="text-sm font-medium text-foreground"
                      >
                        Celular
                      </label>

                      <div className={fieldWrap}>
                        <div className="flex">
                          <div className="h-10 px-2.5 bg-surface-muted text-sm font-medium text-foreground border-0 border-r border-border outline-none rounded-l-xl flex items-center">
                            +55
                          </div>

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
                  ) : (
                    <div className="space-y-1.5">
                      <label
                        htmlFor="email-input"
                        className="text-sm font-medium text-foreground"
                      >
                        E-mail
                      </label>

                      <div className={fieldWrap}>
                        <input
                          ref={emailRef}
                          id="email-input"
                          type="email"
                          inputMode="email"
                          placeholder="voce@empresa.com"
                          value={email}
                          onChange={handleEmailChange}
                          disabled={loading}
                          className={`${inputBase} rounded-xl`}
                          aria-label="Endereço de e-mail"
                        />
                      </div>

                      <p className="text-[11px] text-foreground/50 leading-snug">
                        Você receberá um código de 6 dígitos por e-mail.
                      </p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={sendOtp}
                    disabled={
                      loading ||
                      (authMethod === "sms" ? !isPhoneValid : !isEmailValid)
                    }
                    className={btnPrimary}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Enviando…
                      </span>
                    ) : authMethod === "sms" ? (
                      "Enviar código por SMS"
                    ) : (
                      "Enviar código por e-mail"
                    )}
                  </button>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="otp-input"
                      className="text-sm font-medium text-foreground"
                    >
                      {authMethod === "sms"
                        ? "Código SMS"
                        : "Código por e-mail"}
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

                    <div className="text-[11px] text-foreground/50 leading-snug">
                      {authMethod === "sms"
                        ? `Código enviado para ${otpTarget || fullPhone}`
                        : `Código enviado para ${maskEmail(otpTarget || email)}`}
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
                        onClick={backToStart}
                        disabled={loading}
                        className={link}
                      >
                        {authMethod === "sms"
                          ? "Trocar número"
                          : "Trocar e-mail"}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
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
                      onClick={backToStart}
                      disabled={loading}
                      className={`${btnGhost} px-3`}
                    >
                      Voltar
                    </button>
                  </div>
                </>
              )}

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
