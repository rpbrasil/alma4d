"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { User, Session } from "@supabase/supabase-js";

export type UserRole = "usuario" | "gestor" | "cliente" | "admin";
export type Plano = "trial" | "premium" | "free";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userId: string | null;
  role: UserRole | null;
  clienteId: string | null;
  gestorId: string | null;
  loading: boolean;
  blocked: boolean;
  tipo_plano: Plano | null;
  data_expiracao_plano: string | null;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [gestorId, setGestorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [tipo_plano, setTipoPlano] = useState<Plano | null>(null);
  const [data_expiracao_plano, setDataExpiracaoPlano] = useState<string | null>(
    null,
  );

  const supabase = createClient();

  const loadUserProfile = async (currentUser: User) => {
    try {
      const { data: usuario, error } = await supabase
        .from("usuarios")
        .select("role, cliente_id, gestor_id, ativo")
        .eq("id", currentUser.id)
        .single();

      if (error || !usuario) {
        console.error("Erro ao carregar perfil:", error);
        setRole(null);
        setClienteId(null);
        setGestorId(null);
        return;
      }

      // Verificar se está bloqueado
      if (usuario.ativo === false) {
        setBlocked(true);
        return;
      }

      setRole(usuario.role as UserRole);
      setClienteId(usuario.cliente_id || null);
      setGestorId(usuario.gestor_id || null);
      setBlocked(false);
    } catch (err) {
      console.error("Erro ao carregar perfil:", err);
    }
  };

  const refreshUser = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        setUser(data.session.user);
        setSession(data.session);
        await loadUserProfile(data.session.user);
      }
    } catch (err) {
      console.error("Erro ao atualizar usuário:", err);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setUser(data.session.user);
          setSession(data.session);
          await loadUserProfile(data.session.user);
        }
      } catch (err) {
        console.error("Erro ao inicializar autenticação:", err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        setSession(session);
        await loadUserProfile(session.user);
      } else {
        setUser(null);
        setSession(null);
        setRole(null);
        setClienteId(null);
        setGestorId(null);
      }
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setRole(null);
      setClienteId(null);
      setGestorId(null);
    } catch (err) {
      console.error("Erro ao fazer logout:", err);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    userId: user?.id || null,
    role,
    clienteId,
    gestorId,
    loading,
    blocked,
    tipo_plano,
    data_expiracao_plano,
    signOut,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return context;
}
