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
  group?: "main" | "copsoq";
}

export interface UsuariosKpis {
  total: number;
  ativos: number;
  inativos: number;
  gestores: number;
}

export function useDashboardMetrics() {
  const { user, role } = useAuth();

  const [metrics, setMetrics] = useState<DashboardMetric[]>([]);
  const [usuariosKpis, setUsuariosKpis] = useState<UsuariosKpis>({
    total: 0,
    ativos: 0,
    inativos: 0,
    gestores: 0,
  });

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
        const { supabase } = await import("@/lib/supabase/client");
        
        const normalizedRole = role?.toLowerCase();

        let clientesCount = 0;
        let usuariosOperacionais = 0;
        let profissionaisCount = 0;

        let totalAvaliacoes = 0;
        let mediaGeral = 0;
        let mediaPorUsuario = 0;

        let usuariosTotal = 0;
        let usuariosAtivos = 0;
        let usuariosInativos = 0;
        let gestoresTotal = 0;

        let copsoqAplicacoes = 0;
        let copsoqConcluidas = 0;
        let copsoqUsuariosAvaliados = 0;
        let copsoqProgramacoesAtivas = 0;

        if (normalizedRole === "admin") {
          /** =========================
           * USUÁRIOS
           ========================= */
          const [
            usuariosTotalRes,
            usuariosAtivosRes,
            usuariosInativosRes,
            gestoresRes,
            usuariosOperacionaisRes,
          ] = await Promise.all([
            supabase.from("usuarios").select("id", { count: "exact" }),
            supabase
              .from("usuarios")
              .select("id", { count: "exact" })
              .eq("ativo", true),
            supabase
              .from("usuarios")
              .select("id", { count: "exact" })
              .eq("ativo", false),
            supabase
              .from("usuarios")
              .select("id", { count: "exact" })
              .eq("role", "gestor"),
            supabase
              .from("usuarios")
              .select("id", { count: "exact" })
              .eq("role", "usuario"),
          ]);

          const [
            aplicacoesRes,
            concluidasRes,
            usuariosAvaliadosRes,
            programacoesRes,
          ] = await Promise.all([
            supabase.from("copsoq_aplicacoes").select("id", { count: "exact" }),

            supabase
              .from("copsoq_aplicacoes")
              .select("id", { count: "exact" })
              .eq("status", "concluido"),

            supabase.from("copsoq_aplicacoes").select("usuario_id"),

            supabase
              .from("copsoq_programacoes")
              .select("id", { count: "exact" })
              .eq("ativo", true),
          ]);

          copsoqAplicacoes = aplicacoesRes.count || 0;
          copsoqConcluidas = concluidasRes.count || 0;

          if (usuariosAvaliadosRes.data) {
            copsoqUsuariosAvaliados = new Set(
              usuariosAvaliadosRes.data.map((a) => a.usuario_id),
            ).size;
          }

          copsoqProgramacoesAtivas = programacoesRes.count || 0;

          usuariosTotal = usuariosTotalRes.count || 0;
          usuariosAtivos = usuariosAtivosRes.count || 0;
          usuariosInativos = usuariosInativosRes.count || 0;
          gestoresTotal = gestoresRes.count || 0;
          usuariosOperacionais = usuariosOperacionaisRes.count || 0;

          /** =========================
           * CLIENTES / PROFISSIONAIS
           ========================= */
          const [clientesRes, profissionaisRes] = await Promise.all([
            supabase.from("clientes").select("id", { count: "exact" }),
            supabase.from("profissionais").select("id", { count: "exact" }),
          ]);

          clientesCount = clientesRes.count || 0;
          profissionaisCount = profissionaisRes.count || 0;

          /** =========================
           * AVALIAÇÕES COMPLETAS
           ========================= */
          const { data: avaliacoesData } = await supabase
            .from("avaliacoes_completas")
            .select("user_id, media_total");

          if (avaliacoesData?.length) {
            totalAvaliacoes = avaliacoesData.length;

            const mediasValidas = avaliacoesData
              .map((a) => a.media_total)
              .filter((m) => m != null) as number[];

            if (mediasValidas.length) {
              mediaGeral =
                mediasValidas.reduce((a, b) => a + b, 0) / mediasValidas.length;
            }

            const mediaPorUsuarioMap = new Map<string, number[]>();

            avaliacoesData.forEach((a) => {
              if (!a.user_id || a.media_total == null) return;
              const arr = mediaPorUsuarioMap.get(a.user_id) || [];
              arr.push(a.media_total);
              mediaPorUsuarioMap.set(a.user_id, arr);
            });

            const mediasUsuarios = Array.from(mediaPorUsuarioMap.values()).map(
              (arr) => arr.reduce((a, b) => a + b, 0) / arr.length,
            );

            if (mediasUsuarios.length) {
              mediaPorUsuario =
                mediasUsuarios.reduce((a, b) => a + b, 0) /
                mediasUsuarios.length;
            }
          }
        }

        setUsuariosKpis({
          total: usuariosTotal,
          ativos: usuariosAtivos,
          inativos: usuariosInativos,
          gestores: gestoresTotal,
        });

        setMetrics([
          {
            label: "Clientes",
            value: clientesCount,
            icon: "Users",
            href: "/dashboard/admin/clientes",
            bgColor: "bg-blue-50",
            iconColor: "text-blue-600",
          },
          {
            label: "Usuários",
            value: usuariosOperacionais,
            icon: "Users",
            href: "/dashboard/admin/usuarios",
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
            label: "Auto-avaliações",
            value: totalAvaliacoes,
            icon: "BarChart3",
            href: "/dashboard/relatorios/avaliacoes",
            bgColor: "bg-red-50",
            iconColor: "text-red-600",
          },
          {
            label: "Média Geral",
            value: mediaGeral.toFixed(1),
            icon: "TrendingUp",
            href: "/dashboard/relatorios/avaliacoes",
            bgColor: "bg-indigo-50",
            iconColor: "text-indigo-600",
          },
          {
            label: "Média por Usuário",
            value: mediaPorUsuario.toFixed(1),
            icon: "TrendingUp",
            href: "/dashboard/relatorios/avaliacoes",
            bgColor: "bg-teal-50",
            iconColor: "text-teal-600",
          },
          {
            label: "Questionários Aplicados",
            value: copsoqAplicacoes,
            icon: "BarChart3",
            href: "/dashboard/relatorios/copsoq",
            bgColor: "bg-slate-50",
            iconColor: "text-slate-700",
          },
          {
            label: "Questionários Concluídos",
            value: copsoqConcluidas,
            icon: "TrendingUp",
            href: "/dashboard/relatorios/copsoq",
            bgColor: "bg-green-50",
            iconColor: "text-green-700",
          },
          {
            label: "Usuários Avaliados",
            value: copsoqUsuariosAvaliados,
            icon: "Users",
            href: "/dashboard/relatorios/copsoq",
            bgColor: "bg-blue-50",
            iconColor: "text-blue-700",
          },
          {
            label: "Programações Ativas",
            value: copsoqProgramacoesAtivas,
            icon: "Calendar",
            href: "/dashboard/admin/programacoes",
            bgColor: "bg-purple-50",
            iconColor: "text-purple-700",
          },
        ]);

        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao carregar métricas",
        );
        setMetrics([]);
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
  }, [user, role]);

  return { metrics, usuariosKpis, loading, error };
}
