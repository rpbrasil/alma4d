"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClientSupabase } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

type AuthContextValue = {
  user: User | null;
  role?: "admin" | "cliente" | "gestor" | "usuario";
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<
    "admin" | "cliente" | "gestor" | "usuario" | undefined
  >();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // For development/testing purposes, set a mock user
    // In production, this should be removed and the real auth logic should work
    const mockUser = {
      id: "test-user-id",
      email: "test@example.com",
    } as User;

    setUser(mockUser);
    setRole("admin"); // Set as admin to see the full functionality
    setLoading(false);

    // Uncomment the code below when Supabase auth is properly configured
    /*
    const supabase = createClientSupabase();

    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      if (session?.user) {
        // Fetch user role from database
        const { data: userData } = await supabase
          .from("usuarios")
          .select("role")
          .eq("id", session.user.id)
          .single();

        setRole(userData?.role);
      }

      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);

        if (session?.user) {
          // Fetch user role from database
          const { data: userData } = await supabase
            .from("usuarios")
            .select("role")
            .eq("id", session.user.id)
            .single();

          setRole(userData?.role);
        } else {
          setRole(undefined);
        }

        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
    */
  }, []);

  const signOut = async () => {
    const supabase = createClientSupabase();
    await supabase.auth.signOut();
  };

  const value: AuthContextValue = {
    user,
    role,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
