"use client";

import Image from "next/image";
import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/browser";

function onlyDigits(v: string) {
  return (v ?? "").replace(/\D/g, "");
}

function formatCPF(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

export default function LoginUsuarioPage() {
  const [step, setStep] = useState<"cpf" | "confirm" | "otp">("cpf");

  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [telefoneMask, setTelefoneMask] = useState("");
  const [otp, setOtp] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buscarCpf() {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/by-cpf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cpf }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "CPF não encontrado.");
        return;
      }

      setTelefone(data.telefone);
      setTelefoneMask(data.telefone_mask);
      setStep("confirm");
    } catch {
      setError("Erro ao verificar CPF.");
    } finally {
      setLoading(false);
    }
  }

  async function enviarOtp() {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: telefone,
        options: {
          shouldCreateUser: false,
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

      setStep("otp");
    } catch {
      setError("Erro ao enviar código.");
    } finally {
      setLoading(false);
    }
  }

  async function verificarOtp() {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: telefone,
        token: otp,
        type: "sms",
      });

      if (error || !data.session) {
        setError("Código inválido ou expirado.");
        return;
      }

      window.location.replace("/dashboard/express");
    } catch {
      setError("Erro ao validar código.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-svh flex flex-col justify-center px-4 py-6 bg-white">
      {/* LOGO */}
      <div className="text-center mb-6">
        <Image
          src="/images/alma4d_express_nobground.png"
          alt="alma4D"
          width={72}
          height={72}
          className="mx-auto"
        />
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">
          Acesso do colaborador
        </h1>
      </div>

      {/* CARD */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm w-full max-w-md mx-auto space-y-5">
        {error && (
          <div className="text-sm text-red-600 text-center">{error}</div>
        )}

        {/* STEP CPF */}
        {step === "cpf" && (
          <>
            <p className="text-center text-sm text-slate-500">Digite seu CPF</p>

            <input
              inputMode="numeric"
              autoComplete="off"
              value={formatCPF(cpf)}
              onChange={(e) => setCpf(onlyDigits(e.target.value))}
              placeholder="000.000.000-00"
              className="
                w-full
                h-14
                text-2xl
                text-center
                font-semibold
                tracking-widest
                border border-slate-200
                rounded-2xl
                focus:ring-2 focus:ring-brand
                outline-none
              "
            />

            <button
              onClick={buscarCpf}
              disabled={loading || cpf.length < 11}
              className="
                w-full
                h-14
                text-lg
                font-semibold
                rounded-2xl
                bg-brand
                text-white
                transition active:scale-[0.98]
                disabled:opacity-50
              "
            >
              {loading ? "Verificando..." : "Continuar"}
            </button>
          </>
        )}

        {/* STEP CONFIRM */}
        {step === "confirm" && (
          <>
            <p className="text-center text-sm text-slate-500">
              Enviaremos um código para:
            </p>

            <p className="text-2xl font-bold text-center text-slate-900">
              {telefoneMask}
            </p>

            <button
              onClick={enviarOtp}
              className="w-full h-14 text-lg bg-brand text-white rounded-2xl font-semibold"
            >
              Enviar código
            </button>

            <button
              onClick={() => setStep("cpf")}
              className="text-sm text-slate-500 w-full"
            >
              Corrigir CPF
            </button>
          </>
        )}

        {/* STEP OTP */}
        {step === "otp" && (
          <>
            <p className="text-center text-sm text-slate-500">
              Digite o código recebido
            </p>

            <input
              inputMode="numeric"
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="000000"
              className="
                w-full
                h-16
                text-3xl
                text-center
                font-bold
                tracking-[0.5em]
                border border-slate-200
                rounded-2xl
                focus:ring-2 focus:ring-brand
                outline-none
              "
            />

            <button
              onClick={verificarOtp}
              disabled={otp.length < 6}
              className="
                w-full
                h-14
                text-lg
                bg-brand
                text-white
                rounded-2xl
                font-semibold
                disabled:opacity-50
              "
            >
              Confirmar
            </button>

            <button
              onClick={enviarOtp}
              className="text-sm text-center w-full text-slate-500"
            >
              Reenviar código
            </button>
          </>
        )}
      </div>

      {/* RODAPÉ */}
      <p className="text-xs text-center text-slate-400 mt-6 max-w-sm mx-auto">
        Conexão segura • Dados protegidos • Privacidade garantida
      </p>
    </div>
  );
}
