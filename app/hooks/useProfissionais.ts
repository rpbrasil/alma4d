"use client";

import { useEffect, useState, useMemo } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Profissional } from "@/types/profissional";

export function useProfissionais() {
  const [data, setData] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => getSupabaseClient(), []);
  
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: auth } = await supabase.auth.getUser();
        if (!auth?.user) throw new Error("Sessão inválida.");

        const { data, error } = await supabase
          .from("profissionais")
          .select(
            "id,nome,especialidade,documento,email,calendly_url,whatsapp_url,numero_conselho,ativo,created_at",
          )
          .order("nome", { ascending: true });

        if (error) throw error;

        if (mounted) setData((data ?? []) as Profissional[]);
      } catch (e: unknown) {
        const msg =
          e instanceof Error ? e.message : "Erro ao carregar profissionais";
        if (mounted) {
          setError(msg);
          setData([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  return { data, loading, error };
}
