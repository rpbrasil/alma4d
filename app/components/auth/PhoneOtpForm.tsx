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

    // ✅ pega role do JWT
    const role =
      user?.app_metadata?.claims?.role ||
      user?.app_metadata?.role ||
      user?.user_metadata?.role;

    // ✅ admin entra sempre
    if (role === "admin") {
      router.replace("/dashboard");
      router.refresh();
      return;
    }

    // ✅ busca perfil do usuário
    const { data: perfil, error: perfilError } = await supabase
      .from("usuarios")
      .select("ativo, tipo_plano, cliente_id")
      .eq("id", user.id)
      .single();

    if (perfilError || !perfil) {
      setError("Erro ao localizar dados do usuário.");
      return;
    }

    // ✅ usuário ativo?
    if (!perfil.ativo) {
      setError("Usuário inativo.");
      return;
    }

    // ✅ busca cliente
    const { data: cliente, error: clienteError } = await supabase
      .from("clientes")
      .select("ativo")
      .eq("id", perfil.cliente_id)
      .single();

    if (clienteError || !cliente) {
      setError("Cliente não encontrado.");
      return;
    }

    // ✅ cliente ativo?
    if (!cliente.ativo) {
      setError("Cliente inativo.");
      return;
    }

    // ✅ regra de acesso premium
    if (role === "cliente" && perfil.tipo_plano === "premium") {
      router.replace("/dashboard");
      router.refresh();
      return;
    }

    // ❌ qualquer outro caso bloqueado
    setError("Acesso não permitido.");
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
