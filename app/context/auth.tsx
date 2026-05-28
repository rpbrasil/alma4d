"use client";

import {
  useMemo,
  useRef,
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
type AuthUser = User & {
  nome?: string | null;
};
import { jwtDecode } from "jwt-decode";

export type Role = "admin" | "cliente" | "gestor" | "usuario";
export type Plano = "express" | "premium";

type AuthState = {
  user: AuthUser | null;
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
  user_role?: Role | null;
  user_plano?: Plano | null;
  user_cliente_id?: string | null;
  user_gestor_id?: string | null;
  user_ativo?: boolean | null;
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

function parseClaims(token: string | null | undefined): {
  role: Role | null;
  plano: Plano | null;
  clienteId: string | null;
  gestorId: string | null;
  ativo: boolean | null;
} {
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

    return {
      role: isRole(decoded.user_role) ? decoded.user_role : null,
      plano: isPlano(decoded.user_plano) ? decoded.user_plano : null,
      clienteId:
        typeof decoded.user_cliente_id === "string"
          ? decoded.user_cliente_id
          : null,
      gestorId:
        typeof decoded.user_gestor_id === "string"
          ? decoded.user_gestor_id
          : null,
      ativo:
        typeof decoded.user_ativo === "boolean" ? decoded.user_ativo : null,
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

  const bootstrapDoneRef = useRef(false);

  const hydrateFromSession = useCallback(
    async (session: Session | null) => {
      const token = session?.access_token;
      const baseUser = session?.user ?? null;

      if (!baseUser) {
        setState(buildLoggedOutState());
        return;
      }

      // 🔥 BUSCA DO NOME NO BANCO
      let nome: string | null = null;

      try {
        const { data: profile } = await supabase
          .from("usuarios")
          .select("nome_completo")
          .eq("id", baseUser.id)
          .single();

        nome = profile?.nome_completo ?? null;
      } catch (e) {
        console.warn("Erro ao buscar nome do usuário:", e);
      }

      const user: AuthUser = {
        ...baseUser,
        nome,
      };

      const { role, plano, clienteId, gestorId, ativo } = parseClaims(token);

      setState({
        user,
        role,
        plano,
        clienteId,
        gestorId,
        ativo,
        loading: false,
      });
    },
    [supabase],
  );

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      if (bootstrapDoneRef.current) return;
      bootstrapDoneRef.current = true;

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        await hydrateFromSession(session);
      } catch (error) {
        console.error("Erro ao inicializar autenticação:", error);

        if (!mounted) return;
        setState(buildLoggedOutState());
      }
    }

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      await hydrateFromSession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, hydrateFromSession]);

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
        console.error("Erro ao atualizar sessão:", error);
        setState((prev) => ({ ...prev, loading: false }));
        return;
      }

      await hydrateFromSession(data.session ?? null);
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
