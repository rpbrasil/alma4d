"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function EmailPasswordForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  async function login() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error) router.push("/dashboard");
  }

  return (
    <>
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={login}>Entrar</button>
    </>
  );
}
