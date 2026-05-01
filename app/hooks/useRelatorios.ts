// app/hooks/useRelatorios.ts
"use client";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/auth";

export interface Relatorio {
  id: string;
  titulo: string;
  descricao: string;
  tipo: "pdf" | "excel" | "csv";
  criado_em: string;
  tamanho: number;
  url?: string;
}

export interface MetricaDashboard {
  label: string;
  valor: number | string;
  variacao?: number;
  unidade?: string;
}

export function useRelatorios() {
  const { user } = useAuth();
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
  const [metricas, setMetricas] = useState<MetricaDashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!user?.id) {
        if (isMounted) {
          setRelatorios([]);
          setMetricas([]);
          setLoading(false);
        }
        return;
      }

      try {
        // Import dinâmico
        const { createClientSupabase } = await import("@/lib/supabase/client");
        const supabase = await createClientSupabase();

        // Carregar relatórios
        const { data: relatoriosData, error: relErr } = await supabase
          .from("relatorios")
          .select("*")
          .order("criado_em", { ascending: false })
          .limit(10);

        if (relErr) throw relErr;

        if (isMounted) {
          setRelatorios((relatoriosData || []) as Relatorio[]);
          setError(null);
        }

        // Calcular métricas
        const metricsData: MetricaDashboard[] = [
          {
            label: "Relatórios gerados",
            valor: relatoriosData?.length || 0,
            unidade: "últimos 30 dias",
          },
          {
            label: "Profissionais ativos",
            valor: "12",
            variacao: 23,
          },
          {
            label: "Consultorías realizadas",
            valor: "48",
            variacao: 15,
          },
        ];

        if (isMounted) {
          setMetricas(metricsData);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao carregar relatórios";
        if (isMounted) {
          setError(message);
          setRelatorios([]);
          setMetricas([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  return {
    relatorios,
    metricas,
    loading,
    error,
  };
}
