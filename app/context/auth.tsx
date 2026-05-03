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

type AuthContextValue = {
  user: User | null;
  role?: Role;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;

      const authUser = session?.user ?? null;
      setUser(authUser);

      if (authUser) {
        const { data } = await supabase
          .from("usuarios")
          .select("role")
          .eq("id", authUser.id)
          .single();

        if (!cancelled) setRole(data?.role);
      } else {
        setRole(undefined);
      }

      setLoading(false); // ✅ SEMPRE libera
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      
      if (cancelled) return;

      const authUser = session?.user ?? null;
      setUser(authUser);

      if (authUser) {
        const { data } = await supabase
          .from("usuarios")
          .select("role")
          .eq("id", authUser.id)
          .single();

        setRole(data?.role);
      } else {
        setRole(undefined);
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
    <AuthContext.Provider value={{ user, role, loading, signOut }}>
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
