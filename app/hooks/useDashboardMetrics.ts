// app/hooks/useDashboardMetrics.ts
"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth";

export interface DashboardMetric {
  label: string;
  value: number | string;
  icon: string;
  href: string;
  bgColor: string;
  iconColor: string;
}

export function useDashboardMetrics() {
  const { user, role } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMetrics = async () => {
      if (!user?.id) {
        setMetrics([]);
        setLoading(false);
        return;
      }

      try {
        const { createClientSupabase } = await import("@/lib/supabase/client");
        const supabase = await createClientSupabase();

        const normalizedRole = role?.toLowerCase();

        // Fetch counts based on role
        let clientesCount = 0;
        let gestoresCount = 0;
        let usuariosCount = 0;
        let profissionaisCount = 0;
        let avaliacoesCount = 0;
        let mediaGeral = 0;

        if (normalizedRole === "admin") {
          // Admin sees all
          const [clientesRes, gestoresRes, usuariosRes, profRes, avalRes] = await Promise.all([
            supabase.from("clientes").select("id", { count: "exact" }),
            supabase.from("usuarios").select("id", { count: "exact" }).eq("role", "gestor"),
            supabase.from("usuarios").select("id", { count: "exact" }).eq("role", "usuario"),
            supabase.from("profissionais").select("id", { count: "exact" }),
            supabase.from("avaliacoes").select("media_total", { count: "exact" }),
          ]);

          clientesCount = clientesRes.count || 0;
          gestoresCount = gestoresRes.count || 0;
          usuariosCount = usuariosRes.count || 0;
          profissionaisCount = profRes.count || 0;
          avaliacoesCount = avalRes.count || 0;

          if (avalRes.data && avalRes.data.length > 0) {
            const medias = avalRes.data.map(a => a.media_total).filter(m => m != null);
            mediaGeral = medias.length > 0 ? medias.reduce((a, b) => a + b, 0) / medias.length : 0;
          }
        } else if (normalizedRole === "cliente") {
          // Cliente sees their own data
          const { data: userData } = await supabase
            .from("usuarios")
            .select("cliente_id")
            .eq("id", user.id)
            .single();

          if (userData?.cliente_id) {
            const [gestoresRes, usuariosRes, profRes, avalRes] = await Promise.all([
              supabase.from("usuarios").select("id", { count: "exact" }).eq("role", "gestor").eq("cliente_id", userData.cliente_id),
              supabase.from("usuarios").select("id", { count: "exact" }).eq("role", "usuario").eq("cliente_id", userData.cliente_id),
              supabase.from("profissionais").select("id", { count: "exact" }).eq("cliente_id", userData.cliente_id),
              supabase.from("avaliacoes").select("media_total", { count: "exact" }).eq("cliente_id", userData.cliente_id),
            ]);

            gestoresCount = gestoresRes.count || 0;
            usuariosCount = usuariosRes.count || 0;
            profissionaisCount = profRes.count || 0;
            avaliacoesCount = avalRes.count || 0;

            if (avalRes.data && avalRes.data.length > 0) {
              const medias = avalRes.data.map(a => a.media_total).filter(m => m != null);
              mediaGeral = medias.length > 0 ? medias.reduce((a, b) => a + b, 0) / medias.length : 0;
            }
          }
        } else if (normalizedRole === "gestor") {
          // Gestor sees their users
          const [usuariosRes, profRes, avalRes] = await Promise.all([
            supabase.from("usuarios").select("id", { count: "exact" }).eq("role", "usuario").eq("gestor_id", user.id),
            supabase.from("profissionais").select("id", { count: "exact" }).eq("gestor_id", user.id),
            supabase.from("avaliacoes").select("media_total", { count: "exact" }).eq("gestor_id", user.id),
          ]);

          usuariosCount = usuariosRes.count || 0;
          profissionaisCount = profRes.count || 0;
          avaliacoesCount = avalRes.count || 0;

          if (avalRes.data && avalRes.data.length > 0) {
            const medias = avalRes.data.map(a => a.media_total).filter(m => m != null);
            mediaGeral = medias.length > 0 ? medias.reduce((a, b) => a + b, 0) / medias.length : 0;
          }
        }

        const newMetrics: DashboardMetric[] = [
          {
            label: "Clientes",
            value: clientesCount,
            icon: "Users",
            href: "/dashboard/admin/clientes",
            bgColor: "bg-blue-50",
            iconColor: "text-blue-600",
          },
          {
            label: "Gestores",
            value: gestoresCount,
            icon: "UserCheck",
            href: "/dashboard/profissionais",
            bgColor: "bg-green-50",
            iconColor: "text-green-600",
          },
          {
            label: "Usuários",
            value: usuariosCount,
            icon: "Users",
            href: "/dashboard/usuarios",
            bgColor: "bg-purple-50",
            iconColor: "text-purple-600",
          },
          {
            label: "Profissionais",
            value: profissionaisCount,
            icon: "Briefcase",
            href: "/dashboard/profissionais",
            bgColor: "bg-orange-50",
            iconColor: "text-orange-600",
          },
          {
            label: "Avaliações",
            value: avaliacoesCount,
            icon: "BarChart3",
            href: "/dashboard/relatorios",
            bgColor: "bg-red-50",
            iconColor: "text-red-600",
          },
          {
            label: "Média Geral",
            value: mediaGeral.toFixed(1),
            icon: "TrendingUp",
            href: "/dashboard/relatorios",
            bgColor: "bg-indigo-50",
            iconColor: "text-indigo-600",
          },
        ].filter(metric => {
          // Filter based on role
          if (normalizedRole === "admin") return true;
          if (normalizedRole === "cliente") return !["Clientes"].includes(metric.label);
          if (normalizedRole === "gestor") return !["Clientes", "Gestores"].includes(metric.label);
          return false;
        });

        setMetrics(newMetrics);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro ao carregar métricas";
        setError(message);
        setMetrics([]);
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
  }, [user, role]);

  return { metrics, loading, error };
}