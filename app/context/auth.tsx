"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

type Role = "admin" | "cliente" | "gestor" | "usuario";
type Plano = "express" | "premium";

type AuthContextValue = {
  user: User | null;
  role?: Role;
  plano?: Plano;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | undefined>();
  const [plano, setPlano] = useState<Plano | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async (authUser: User) => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("role, tipo_plano")
        .eq("id", authUser.id)
        .single();

      if (cancelled) return;

      if (error || !data) {
        setRole(undefined);
        setPlano(undefined);
        return;
      }

      setRole(data.role);
      setPlano(data.tipo_plano);
    };

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      const authUser = session?.user ?? null;
      setUser(authUser);

      if (authUser) {
        await loadProfile(authUser);
      } else {
        setRole(undefined);
        setPlano(undefined);
      }

      setLoading(false);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (cancelled) return;

      const authUser = session?.user ?? null;
      setUser(authUser);

      if (authUser) {
        await loadProfile(authUser);
      } else {
        setRole(undefined);
        setPlano(undefined);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, role, plano, loading, signOut }}>
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
