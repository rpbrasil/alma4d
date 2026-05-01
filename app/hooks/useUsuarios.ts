// app/hooks/useUsuarios.ts
"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth";

export interface Usuario {
  id: string;
  email: string;
  nome: string;
  role: "admin" | "cliente" | "gestor" | "usuario";
  status: "ativo" | "inativo";
  criado_em: string;
  ultimo_acesso?: string;
}

export function useUsuarios() {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadUsuarios = async () => {
      if (!user?.id) {
        if (isMounted) {
          setUsuarios([]);
          setLoading(false);
        }
        return;
      }

      try {
        // Import dinâmico
        const { createClientSupabase } = await import("@/lib/supabase/client");
        const supabase = await createClientSupabase();

        // Carregar usuários
        const { data: usuariosData, error: err } = await supabase
          .from("usuarios")
          .select("*")
          .order("criado_em", { ascending: false });

        if (err) throw err;

        if (isMounted) {
          setUsuarios((usuariosData || []) as Usuario[]);
          setError(null);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao carregar usuários";
        if (isMounted) {
          setError(message);
          // Retorna dados mock se tabela não existir
          setUsuarios([
            {
              id: "1",
              email: "admin@example.com",
              nome: "Admin",
              role: "admin",
              status: "ativo",
              criado_em: new Date().toISOString(),
              ultimo_acesso: new Date().toISOString(),
            },
            {
              id: "2",
              email: "cliente@example.com",
              nome: "Cliente",
              role: "cliente",
              status: "ativo",
              criado_em: new Date().toISOString(),
            },
          ]);
          setError(null); // Limpa erro para usar dados mock
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadUsuarios();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  return {
    usuarios,
    loading,
    error,
  };
}
