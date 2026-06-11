"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Client-side guard should call server whoami to obtain canonical usuario profile.
 */

type GuardOptions = {
  requirePlano?: "express" | "premium";
  allowAdmin?: boolean;
  redirectIfFail?: string;
};

export function useAccessGuard(options?: GuardOptions) {
  const {
    requirePlano = "express",
    allowAdmin = true,
    redirectIfFail = "/ativacao",
  } = options || {};

  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        let res = await fetch("/api/auth/whoami");

        // ✅ retry leve (corrige race condition)
        if (!res.ok) {
          await new Promise((r) => setTimeout(r, 300));
          res = await fetch("/api/auth/whoami");
        }

        if (!res.ok) {
          router.replace("/login");
          return;
        }

        const perfil = await res.json();

        if (!perfil || !perfil.usuario_id) {
          console.warn("perfil inconsistente, aguardando...");
          if (!cancelled) setLoading(false);
          return;
        }

        // ✅ admin bypass
        if (allowAdmin && perfil.role === "admin") {
          if (!cancelled) setLoading(false);
          return;
        }

        const clienteAtivo = perfil.cliente_id ?? null;

        if (!clienteAtivo) {
          router.replace(redirectIfFail);
          return;
        }

        if (!cancelled) setLoading(false);
      } catch (err) {
        console.warn("erro guard:", err);
        router.replace("/login");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [requirePlano, allowAdmin, redirectIfFail, router]);

  return { loading };
}
