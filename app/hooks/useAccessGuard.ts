"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser as supabase } from "@/lib/supabase/browser";

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
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user?.id) {
        router.replace("/login");
        return;
      }

      const user = data.user;

      const { data: perfil } = await supabase
        .from("usuarios")
        .select("ativo, tipo_plano, cliente_id, role")
        .eq("id", user.id)
        .single();

      if (!perfil) {
        router.replace("/login");
        return;
      }

      // ✅ admin bypass
      if (allowAdmin && perfil.role === "admin") {
        if (!cancelled) setLoading(false);
        return;
      }

      // ✅ valida usuário
      if (!perfil.ativo) {
        router.replace(redirectIfFail);
        return;
      }

      // ✅ valida plano
      if (requirePlano && perfil.tipo_plano !== requirePlano) {
        router.replace(redirectIfFail);
        return;
      }

      // ✅ valida cliente
      const { data: cliente } = await supabase
        .from("clientes")
        .select("ativo")
        .eq("id", perfil.cliente_id)
        .single();

      if (!cliente?.ativo) {
        router.replace(redirectIfFail);
        return;
      }

      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [requirePlano, allowAdmin, redirectIfFail, router]);

  return { loading };
}
