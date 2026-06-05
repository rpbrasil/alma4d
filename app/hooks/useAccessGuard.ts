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
        const res = await fetch("/api/auth/whoami");
        if (!res.ok) {
          router.replace("/login");
          return;
        }

        const perfil = await res.json();

        if (!perfil?.usuario_id) {
          router.replace("/login");
          return;
        }

        // admin bypass
        if (allowAdmin && perfil.role === "admin") {
          if (!cancelled) setLoading(false);
          return;
        }

        if (!perfil.ativo) {
          router.replace(redirectIfFail);
          return;
        }

        if (requirePlano && perfil.tipo_plano !== requirePlano) {
          router.replace(redirectIfFail);
          return;
        }

        const clienteAtivo = perfil.cliente_id ? perfil.cliente_id : null;
        if (!clienteAtivo) {
          router.replace(redirectIfFail);
          return;
        }

        if (!cancelled) setLoading(false);
      } catch (e) {
        router.replace("/login");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [requirePlano, allowAdmin, redirectIfFail, router]);

  return { loading };
}
