"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function PhoneOtpForm() {
  const [phone, setPhone] = useState("");
  const [token, setToken] = useState("");
  const [sent, setSent] = useState(false);
  const router = useRouter();

  async function sendOtp() {
    await supabase.auth.signInWithOtp({ phone });
    setSent(true);
  }

  async function verifyOtp() {
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: "sms",
    });

    if (!error) router.push("/dashboard");
  }

  return sent ? (
    <>
      <input value={token} onChange={(e) => setToken(e.target.value)} />
      <button onClick={verifyOtp}>Entrar</button>
    </>
  ) : (
    <>
      <input value={phone} onChange={(e) => setPhone(e.target.value)} />
      <button onClick={sendOtp}>Enviar código</button>
    </>
  );
}
