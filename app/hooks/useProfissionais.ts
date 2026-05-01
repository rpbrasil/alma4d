// app/hooks/useProfissionais.ts
"use client";
import type { Profissional } from "@/types/profissional";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth";

export function useProfissionais() {
  const { user } = useAuth();
  const [data, setData] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadProfissionais = async () => {
      if (!user?.id) {
        if (isMounted) {
          setData([]);
          setLoading(false);
        }
        return;
      }

      try {
        // Import dinâmico para evitar SSR issues
        const { createClientSupabase } = await import("@/lib/supabase/client");
        const supabase = await createClientSupabase();

        const { data: profissionais, error: err } = await supabase
          .from("profissionais")
          .select("*")
          .order("nome", { ascending: true });

        if (err) throw err;

        if (isMounted) {
          setData((profissionais || []) as Profissional[]);
          setError(null);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao carregar profissionais";
        if (isMounted) {
          setError(message);
          setData([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProfissionais();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  return {
    data,
    loading,
    error,
  };
}
