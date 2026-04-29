"use client";

import React, { useState } from "react";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClientSupabase } from "@/lib/supabase/client";

export function LoginForm() {
  const supabase = createClientSupabase();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    if (!email || !password) {
      setError("Por favor, preencha todos os campos");
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError("Email ou senha inválidos");
        setIsLoading(false);
        return;
      }

      // ✅ Buscar claims do usuário recém logado
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const role = user?.app_metadata?.role;

      // 🔀 Redirect por role
      if (role === "admin") {
        router.push("/dashboard/admin");
      } else if (role === "cliente") {
        router.push("/dashboard");
      } else if (role === "gestor") {
        router.push("/dashboard/gestor");
      } else {
        router.push("/dashboard");
      }

      if (error) {
        setError("Email ou senha inválidos");
        setIsLoading(false);
        return;
      }

      // ✅ Sessão criada (cookie HttpOnly)
      setSuccess("Login realizado com sucesso");
      router.push("/dashboard");
    } catch (err) {
      setError("Erro inesperado ao fazer login: " + (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email */}
        <div>
          {/* <label htmlFor="email" className="block text-sm font-medium mb-2">
            Email
          </label> */}
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-5 w-5 text-brand-secondary/60" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:border-transparent transition-colors dark:bg-surface dark:border-border/50"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Senha */}
        <div>
          {/* <label htmlFor="password" className="block text-sm font-medium mb-2">
            Senha
          </label> */}
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-5 w-5 text-brand-secondary/60" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-10 py-2.5 border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:border-transparent transition-colors dark:bg-surface dark:border-border/50"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-brand-secondary/60 hover:text-brand-secondary transition-colors"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              disabled={isLoading}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mensagens de Erro e Sucesso */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm dark:bg-red-950 dark:border-red-800 dark:text-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm dark:bg-green-950 dark:border-green-800 dark:text-green-200">
            {success}
          </div>
        )}

        {/* Botão Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-brand-secondary text-white font-semibold py-2.5 rounded-lg hover:bg-brand-secondary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 dark:bg-brand-secondary/80 dark:hover:bg-brand-secondary/70"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Entrando...
            </>
          ) : (
            "Entrar"
          )}
        </button>

        {/* Links auxiliares */}
        <div className="flex items-center justify-between text-xs">
          <a
            href="/contato"
            className="text-brand-secondary hover:underline transition-colors"
          >
            Esqueceu a senha?
          </a>
          {/* <a
            href="/contato"
            className="text-brand-secondary hover:underline transition-colors"
          >
            Criar conta
          </a> */}
        </div>
      </form>
    </div>
  );
}
