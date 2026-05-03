// app/hooks/useProfissionais.ts
"use client";

import type { Profissional } from "@/types/profissional";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

export function useProfissionais() {
  const [data, setData] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // ✅ valida sessão no client
        const { data: auth, error: authErr } = await supabase.auth.getUser();

        if (authErr || !auth.user) {
          throw new Error("Sessão inválida");
        }

        const { data, error } = await supabase
          .from("profissionais")
          .select("id,nome,ativo")
          .order("nome", { ascending: true });

        if (error) throw error;

        if (mounted) {
          setData((data ?? []) as Profissional[]);
          setError(null);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao carregar profissionais";

        if (mounted) {
          setError(message);
          setData([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    data,
    loading,
    error,
  };
}
