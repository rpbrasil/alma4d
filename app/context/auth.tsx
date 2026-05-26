"use client";

import { useMemo, useRef } from "react";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
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

const VALID_ROLES = ["admin", "cliente", "gestor", "usuario"] as const;
const VALID_PLANOS = ["express", "premium"] as const;

const PROFILE_CACHE_KEY = "auth_profile_cache_v1";
const PROFILE_CACHE_TTL_MS = 15 * 60 * 1000; // 15 min

type CachedProfile = {
  userId: string;
  role?: Role;
  plano?: Plano;
  updatedAt: number;
};

function isRole(value: unknown): value is Role {
  return typeof value === "string" && VALID_ROLES.includes(value as Role);
}

function isPlano(value: unknown): value is Plano {
  return typeof value === "string" && VALID_PLANOS.includes(value as Plano);
}

function safeStorageAvailable() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function clearCachedProfile() {
  if (!safeStorageAvailable()) return;
  try {
    localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {
    // silencioso
  }
}

function readCachedProfile(userId: string): CachedProfile | null {
  if (!safeStorageAvailable()) return null;

  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<CachedProfile> | null;
    if (!parsed || typeof parsed !== "object") {
      clearCachedProfile();
      return null;
    }

    if (parsed.userId !== userId) {
      // cache de outro usuário → invalida
      clearCachedProfile();
      return null;
    }

    if (typeof parsed.updatedAt !== "number") {
      clearCachedProfile();
      return null;
    }

    const isExpired = Date.now() - parsed.updatedAt > PROFILE_CACHE_TTL_MS;
    if (isExpired) {
      clearCachedProfile();
      return null;
    }

    return {
      userId: parsed.userId,
      role: isRole(parsed.role) ? parsed.role : undefined,
      plano: isPlano(parsed.plano) ? parsed.plano : undefined,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    clearCachedProfile();
    return null;
  }
}

function writeCachedProfile(profile: CachedProfile) {
  if (!safeStorageAvailable()) return;

  try {
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
  } catch {
    // silencioso
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | undefined>();
  const [plano, setPlano] = useState<Plano | undefined>();
  const [loading, setLoading] = useState(true);

  const supabase = useMemo(() => getSupabaseClient(), []);
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const applyProfileState = (profile: { role?: Role; plano?: Plano }) => {
      if (cancelled) return;
      setRole(profile.role);
      setPlano(profile.plano);
    };

    const clearProfileState = () => {
      if (cancelled) return;
      setRole(undefined);
      setPlano(undefined);
    };

    const fetchAndCacheProfile = async (authUser: User) => {
      try {
        const { data, error } = await supabase
          .from("usuarios")
          .select("role, tipo_plano")
          .eq("id", authUser.id)
          .maybeSingle();

        if (cancelled) return;

        if (error || !data) {
          clearProfileState();
          clearCachedProfile();
          return;
        }

        const nextRole = isRole(data.role) ? data.role : undefined;
        const nextPlano = isPlano(data.tipo_plano)
          ? data.tipo_plano
          : undefined;

        applyProfileState({
          role: nextRole,
          plano: nextPlano,
        });

        writeCachedProfile({
          userId: authUser.id,
          role: nextRole,
          plano: nextPlano,
          updatedAt: Date.now(),
        });
      } catch (e) {
        if (!cancelled) {
          console.error("Erro ao carregar perfil:", e);
          clearProfileState();
          clearCachedProfile();
        }
      }
    };

    const bootstrapFromSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (cancelled) return;

        const authUser = session?.user ?? null;
        currentUserIdRef.current = authUser?.id ?? null;
        setUser(authUser);

        if (!authUser) {
          clearProfileState();
          clearCachedProfile();
          setLoading(false);
          return;
        }

        // 1) hidrata instantaneamente do cache
        const cached = readCachedProfile(authUser.id);
        if (cached) {
          applyProfileState({
            role: cached.role,
            plano: cached.plano,
          });

          // 2) libera a UI já com cache
          setLoading(false);

          // 3) revalida em background (SWR)
          void fetchAndCacheProfile(authUser);
          return;
        }

        // sem cache válido → busca real
        await fetchAndCacheProfile(authUser);
        if (!cancelled) setLoading(false);
      } catch (e) {
        if (!cancelled) {
          console.error("Erro ao iniciar autenticação:", e);
          setUser(null);
          clearProfileState();
          clearCachedProfile();
          setLoading(false);
        }
      }
    };

    void bootstrapFromSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (cancelled) return;

      const nextUser = session?.user ?? null;
      const previousUserId = currentUserIdRef.current;
      const nextUserId = nextUser?.id ?? null;
      const userChanged = previousUserId !== nextUserId;

      currentUserIdRef.current = nextUserId;

      if (!nextUser) {
        clearCachedProfile();
        setUser(null);
        clearProfileState();
        setLoading(false);
        return;
      }

      // Se trocou de conta, limpamos o cache anterior
      if (userChanged) {
        clearCachedProfile();
        setLoading(true);
      }

      setUser(nextUser);

      const cached = readCachedProfile(nextUser.id);

      if (cached) {
        applyProfileState({
          role: cached.role,
          plano: cached.plano,
        });

        // Em troca de usuário, já libera a UI com o cache do usuário atual
        if (userChanged && !cancelled) {
          setLoading(false);
        }

        // Revalidação em background
        void fetchAndCacheProfile(nextUser);
        return;
      }

      // Sem cache → busca real
      await fetchAndCacheProfile(nextUser);

      if (!cancelled) {
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signOut = async () => {
    try {
      clearCachedProfile();
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Erro ao sair:", e);
    }
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
