"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function DefinirSenhaAdminPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSetPassword() {
    setError(null);

    if (!password || password.length < 8) {
      setError("A senha deve ter no mínimo 8 caracteres.");
      return;
    }

    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      setError("Erro ao definir a senha. Tente novamente.");
      return;
    }

    setSuccess(true);

    // pequeno delay para UX
    setTimeout(() => {
      router.push("/dashboard");
    }, 1500);
  }

  return (
    <section className="max-w-md mx-auto px-4 pt-16 pb-12">
      {/* Header */}
      <header className="text-center space-y-2 mb-6">
        <h1 className="text-2xl font-semibold text-foreground">
          Definir senha
        </h1>
        <p className="text-sm text-foreground/60">
          Crie uma senha para acessar o painel administrativo
        </p>
      </header>

      {/* Card */}
      <div className="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 text-center">
            Senha definida com sucesso. Redirecionando…
          </div>
        ) : (
          <>
            <input
              type="password"
              placeholder="Nova senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
            />

            <input
              type="password"
              placeholder="Confirmar senha"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
            />

            <button
              onClick={handleSetPassword}
              disabled={loading}
              className="w-full rounded-lg bg-brand-primary py-2 text-white"
            >
              {loading ? "Salvando..." : "Definir senha"}
            </button>
          </>
        )}
      </div>

      {/* Aviso */}
      <div className="mt-4 text-center text-xs text-foreground/50">
        Esta página é temporária e pode ser removida após a configuração.
      </div>
    </section>
  );
}
