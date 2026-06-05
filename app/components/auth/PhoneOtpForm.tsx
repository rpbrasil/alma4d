"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";

export default function PhoneOtpForm() {
  const [phone, setPhone] = useState("");
  const [token, setToken] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  async function sendOtp() {
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  async function verifyOtp() {
    setError(null);

    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: "sms",
    });

    if (error) {
      setError(error.message);
      return;
    }

    const user = data?.user;

    if (!user) {
      setError("Usuário não encontrado.");
      return;
    }

    // CHECK: preferir validar via servidor (whoami) para obter usuario_id
    try {
      const who = await fetch("/api/auth/whoami");
      if (!who.ok) {
        setError("Erro ao validar usuário.");
        return;
      }

      const perfil = await who.json();

      const role =
        perfil?.role ||
        user?.app_metadata?.claims?.role ||
        user?.app_metadata?.role ||
        user?.user_metadata?.role;

      if (role === "admin") {
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      if (!perfil?.usuario_id) {
        setError("Usuário não vinculado.");
        return;
      }

      if (!perfil?.ativo) {
        setError("Usuário inativo.");
        return;
      }

      if (!perfil?.cliente_id) {
        setError("Cliente não encontrado.");
        return;
      }

      if (role === "cliente" && perfil.tipo_plano === "premium") {
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      setError("Acesso não permitido.");
      return;
    } catch (e) {
      setError("Erro ao validar usuário.");
      return;
    }
  }

  return sent ? (
    <>
      <input
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="Código"
      />
      <button onClick={verifyOtp}>Entrar</button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </>
  ) : (
    <>
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Telefone"
      />
      <button onClick={sendOtp}>Enviar código</button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </>
  );
}
