"use client";

import { createContext, useContext, type ReactNode } from "react";

type AuthContextValue = {
  user: null | {
    id: string;
    email?: string;
  };
  role?: "admin" | "cliente" | "gestor" | "usuario";
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const value: AuthContextValue = {
    user: null,
    role: "cliente",
    signOut: async () => {
      console.log("logout (stub)");
    },
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
