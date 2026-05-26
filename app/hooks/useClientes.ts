// app/hooks/useClientes.ts
"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth";
import { getSupabaseClient } from "@/lib/supabase/client";

export interface Cliente {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  plano: "trial" | "basic" | "premium";
  status: "ativo" | "inativo" | "bloqueado";
  criado_em: string;
  data_expiracao_plano?: string;
  profissionais_count: number;
}

export function useClientes() {
  const { user, role } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadClientes = async () => {
      if (!user?.id || role !== "admin") {
        if (isMounted) {
          setClientes([]);
          setLoading(false);
        }
        return;
      }

      try {
        const supabase = getSupabaseClient();        
        // Carregar clientes
        const { data: clientesData, error: err } = await supabase
          .from("clientes")
          .select("*")
          .order("criado_em", { ascending: false });

        if (err) throw err;

        if (isMounted) {
          setClientes((clientesData || []) as Cliente[]);
          setError(null);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao carregar clientes";
        if (isMounted) {
          setError(message);
          // Mock data
          setClientes([
            {
              id: "1",
              nome: "Empresa A",
              email: "contato@empresaa.com",
              telefone: "(11) 3000-0000",
              plano: "premium",
              status: "ativo",
              criado_em: new Date().toISOString(),
              profissionais_count: 5,
            },
            {
              id: "2",
              nome: "Empresa B",
              email: "contato@empresab.com",
              plano: "trial",
              status: "ativo",
              criado_em: new Date().toISOString(),
              profissionais_count: 2,
            },
          ]);
          setError(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadClientes();

    return () => {
      isMounted = false;
    };
  }, [user?.id, role]);

  return {
    clientes,
    loading,
    error,
  };
}
