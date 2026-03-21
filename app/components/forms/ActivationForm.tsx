"use client";

import { useState } from "react";
import { createClient } from "../../../lib/supabase/clients";
import { ativarLivroAction } from "@/app/actions/ativar-livro";

export default function ActivationForm() {
  const supabase = createClient();

  const [step, setStep] = useState(1); // 1: Telefone, 2: Código, 3: Perfil
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");

  // Estilo Padrão Profissional para os Inputs
  const inputClass =
    "w-full p-4 rounded-xl border border-border bg-white text-base text-foreground outline-none focus:ring-2 focus:ring-[#019499] transition-all placeholder:text-foreground/30";

  // ETAPA 1: Enviar SMS
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    // Adicionamos o '+' internamente para o Supabase, mas removemos do input visual
    const { error } = await supabase.auth.signInWithOtp({
      phone: `+${phone.replace(/\D/g, "")}`,
    });
    if (error)
      setError(error.message || "Erro ao enviar SMS. Verifique o número.");
    else setStep(2);
    setLoading(false);
  }

  // ETAPA 2: Validar Código
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const token = formData.get("token") as string;

    // Novamente, usamos o telefone formatado internamente
    const formattedPhone = `+${phone.replace(/\D/g, "")}`;
    const { error } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token,
      type: "sms",
    });

    if (error) setError("Código inválido ou expirado.");
    else setStep(3);
    setLoading(false);
  }

  // ETAPA 3: Salvar Perfil Trial (Server Action)
  async function handleFinalSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    // Enviamos o telefone original formatado para a Action
    formData.append("telefone", `+${phone.replace(/\D/g, "")}`);

    const result = await ativarLivroAction(formData);

    if (result.success && result.redirectUrl) {
      // Redireciona para o checkout do Pagar.me
      window.location.href = result.redirectUrl;
    } else {
      setError(result.message || null);
      setLoading(false);
    }
  }

  return (
    <div className="w-full bg-white p-8 md:p-10 rounded-3xl border border-border shadow-2xl relative overflow-hidden">
      {/* Indicador de Carregamento Sutil */}
      {loading && (
        <div className="absolute top-0 left-0 w-full h-1 bg-[#019499] animate-pulse"></div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100 font-medium">
          ⚠️ {error}
        </div>
      )}

      {/* PASSO 1: TELEFONE */}
      {step === 1 && (
        <form onSubmit={handleSendOtp} className="flex flex-col gap-6">
          {/* 4. Mensagem Dinâmica da Etapa */}
          <h3 className="text-2xl font-bold text-[#030870]">
            Digite os números do seu telefone
          </h3>
          <p className="text-foreground/60 -mt-3">
            Insira o DDD e o número (ex: 11999999999). Sem o sinal de +.
          </p>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="phone"
              className="text-sm font-bold text-foreground/70"
            >
              WhatsApp / Celular
            </label>
            {/* 3. Input Profissional & Placeholder sem + */}
            <input
              id="phone"
              type="tel"
              name="phone"
              placeholder="5511999999999"
              className={inputClass}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <button
            disabled={loading}
            className="w-full bg-[#030870] text-white p-5 rounded-2xl font-bold text-lg hover:bg-[#030870]/90 transition-all shadow-md active:scale-[0.98]"
          >
            {loading ? "Enviando SMS..." : "Receber Código de Acesso"}
          </button>
        </form>
      )}

      {/* PASSO 2: TOKEN SMS */}
      {step === 2 && (
        <form
          onSubmit={handleVerifyOtp}
          className="flex flex-col gap-6 items-center text-center"
        >
          {/* 4. Mensagem Dinâmica da Etapa */}
          <h3 className="text-2xl font-bold text-[#030870]">
            Digite o código enviado a você por SMS
          </h3>
          <p className="text-foreground/60 -mt-3">
            Enviamos um código de 6 dígitos para o número que você informou.
          </p>

          <div className="w-full max-w-sm flex flex-col gap-2">
            <label
              htmlFor="token"
              className="text-sm font-bold text-foreground/70"
            >
              Código de Verificação
            </label>
            <input
              id="token"
              name="token"
              type="text"
              placeholder="000000"
              className={`${inputClass} text-center text-3xl font-mono tracking-[1em]`}
              required
              maxLength={6}
            />
          </div>
          <button
            disabled={loading}
            className="w-full bg-[#019499] text-white p-5 rounded-2xl font-bold text-lg hover:bg-[#019499]/90 transition-all shadow-md active:scale-[0.98]"
          >
            {loading ? "Verificando..." : "Confirmar e Continuar"}
          </button>
          <button
            type="button"
            onClick={() => setStep(1)}
            className="text-sm text-foreground/50 hover:text-[#030870] hover:underline"
          >
            Voltar e corrigir número
          </button>
        </form>
      )}

      {/* PASSO 3: DADOS ALMA4D (TRIAL + SEXO) */}
      {step === 3 && (
        <form
          action={handleFinalSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5"
        >
          <h3 className="md:col-span-2 text-2xl font-bold text-[#030870] mb-2">
            Finalize seu Perfil Trial
          </h3>

          <div className="md:col-span-2 flex flex-col gap-1">
            <label className="text-sm font-bold text-foreground/70">
              Nome Completo
            </label>
            <input
              name="nome_completo"
              type="text"
              className={inputClass}
              required
              placeholder="Como no livro..."
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold text-foreground/70">
              E-mail
            </label>
            <input
              name="email"
              type="email"
              className={inputClass}
              required
              placeholder="seu@email.com"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold text-foreground/70">
              CPF (Documento)
            </label>
            <input
              name="documento"
              type="text"
              className={inputClass}
              required
              placeholder="000.000.000-00"
            />
          </div>

          {/* Adicionado Campo Sexo conforme sua tabela */}
          <div className="md:col-span-2 flex flex-col gap-1">
            <label className="text-sm font-bold text-foreground/70">Sexo</label>
            <select name="sexo" className={`${inputClass} bg-white`} required>
              <option value="">Selecione...</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold text-foreground/70">
              Peso Atual (kg)
            </label>
            <input
              name="peso_kg"
              type="number"
              step="0.01"
              className={inputClass}
              placeholder="70.5"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold text-foreground/70">
              Altura (cm)
            </label>
            <input
              name="altura_cm"
              type="number"
              className={inputClass}
              placeholder="175"
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-3 py-3 border-t border-border mt-4">
            <input
              type="checkbox"
              name="aceitou_termos"
              id="aceite"
              required
              className="w-6 h-6 accent-[#019499] rounded-md"
            />
            <label
              htmlFor="aceite"
              className="text-xs text-foreground/60 leading-tight"
            >
              Confirmo que sou o titular deste cadastro e aceito os Termos de
              Uso e Política de Privacidade alma4D.
            </label>
          </div>

          <button
            disabled={loading}
            className="md:col-span-2 bg-[#030870] text-white p-5 rounded-2xl font-bold text-xl shadow-lg hover:scale-[1.01] transition-all active:scale-[0.98]"
          >
            {loading
              ? "Processando..."
              : "Finalizar Cadastro & Ir para Pagamento"}
          </button>
        </form>
      )}
    </div>
  );
}
