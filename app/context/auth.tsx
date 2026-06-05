"use client";

import {
  useMemo,
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { jwtDecode } from "jwt-decode";

type AuthUser = User & {
  nome?: string | null;
};

export type Role = "admin" | "cliente" | "gestor" | "usuario";
export type Plano = "express" | "premium";

type AuthState = {
  user: AuthUser | null;
  usuarioId?: string | null;
  role: Role | null;
  plano: Plano | null;
  clienteId: string | null;
  gestorId: string | null;
  ativo: boolean | null;
  loading: boolean;
};

type AuthContextValue = AuthState & {
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AppJwtClaims = {
  app_metadata?: {
    user_role?: Role | null;
    user_plano?: Plano | null;
    user_cliente_id?: string | null;
    user_gestor_id?: string | null;
    user_ativo?: boolean | null;
  };
};

function isRole(value: unknown): value is Role {
  return (
    value === "admin" ||
    value === "cliente" ||
    value === "gestor" ||
    value === "usuario"
  );
}

function isPlano(value: unknown): value is Plano {
  return value === "express" || value === "premium";
}

function parseClaims(token: string | null | undefined) {
  if (!token) {
    return {
      role: null,
      plano: null,
      clienteId: null,
      gestorId: null,
      ativo: null,
    };
  }

  try {
    const decoded = jwtDecode<AppJwtClaims>(token);

    const meta = decoded.app_metadata;

    return {
      role: isRole(meta?.user_role) ? meta.user_role : null,
      plano: isPlano(meta?.user_plano) ? meta.user_plano : null,
      clienteId:
        typeof meta?.user_cliente_id === "string" ? meta.user_cliente_id : null,
      gestorId:
        typeof meta?.user_gestor_id === "string" ? meta.user_gestor_id : null,
      ativo: typeof meta?.user_ativo === "boolean" ? meta.user_ativo : null,
    };
  } catch (error) {
    console.warn("Erro ao decodificar access_token JWT:", error);

    return {
      role: null,
      plano: null,
      clienteId: null,
      gestorId: null,
      ativo: null,
    };
  }
}

function buildLoggedOutState(): AuthState {
  return {
    user: null,
    role: null,
    plano: null,
    clienteId: null,
    gestorId: null,
    ativo: null,
    loading: false,
  };
}

function buildLoadingState(): AuthState {
  return {
    user: null,
    role: null,
    plano: null,
    clienteId: null,
    gestorId: null,
    ativo: null,
    loading: true,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [state, setState] = useState<AuthState>(buildLoadingState());

  // Atualiza estado BASE imediatamente, sem esperar query extra
  const applySession = useCallback((session: Session | null) => {
    const token = session?.access_token;
    const baseUser = session?.user ?? null;

    if (!baseUser) {
      setState(buildLoggedOutState());
      return;
    }

    const { role, plano, clienteId, gestorId, ativo } = parseClaims(token);

    setState({
      user: {
        ...baseUser,
        nome: null,
      },
      role,
      plano,
      clienteId,
      gestorId,
      ativo,
      loading: false,
    });
  }, []);

  // Busca nome separadamente, sem travar loading global
  const hydrateUserName = useCallback(async (userId: string) => {
    // Deprecated: kept for compatibility but no longer queries DB directly.
    // New flow: use /api/auth/whoami to obtain usuario_id and nome_completo.
    try {
      const res = await fetch("/api/auth/whoami");
      if (!res.ok) return;
      const j = await res.json();
      const nome = j?.nome_completo ?? null;
      const usuarioId = j?.usuario_id ?? null;

      setState((prev) => {
        if (!prev.user || prev.user.id !== userId) return prev;

        return {
          ...prev,
          usuarioId,
          user: {
            ...prev.user,
            nome,
          },
        };
      });
    } catch (e) {
      console.warn("Erro ao obter whoami:", e);
    }
  }, []);

  const syncFromSession = useCallback(
    async (session: Session | null) => {
      applySession(session);

      if (session?.user?.id) {
        void hydrateUserName(session.user.id);
      }
    },
    [applySession, hydrateUserName],
  );

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error("Erro ao obter sessão:", error.message);
          setState(buildLoggedOutState());
          return;
        }

        await syncFromSession(session);
      } catch (error) {
        console.error("Erro ao inicializar autenticação:", error);
        if (!mounted) return;
        setState(buildLoggedOutState());
      }
    };

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      // IMPORTANTE: não usar await direto aqui
      setTimeout(() => {
        if (!mounted) return;
        void syncFromSession(session);
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, syncFromSession]);

  const signOut = async () => {
    try {
      setState(buildLoggedOutState());
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  const refreshSession = async () => {
    try {
      setState((prev) => ({ ...prev, loading: true }));

      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        console.error("Erro ao atualizar sessão:", error.message);
        setState((prev) => ({ ...prev, loading: false }));
        return;
      }

      await syncFromSession(data.session ?? null);
    } catch (error) {
      console.error("Erro inesperado ao atualizar sessão:", error);
      setState((prev) => ({ ...prev, loading: false }));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return ctx;
}
