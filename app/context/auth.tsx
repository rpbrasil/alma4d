"use client";

import {
  useMemo,
  useRef,
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { getStorageItem, setStorageItem, removeStorageItem } from "@/lib/storage";

type Role = "admin" | "cliente" | "gestor" | "usuario";
type Plano = "express" | "premium";

type AuthContextValue = {
  user: User | null;
  role: Role | null;
  plano: Plano | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const VALID_ROLES = ["admin", "cliente", "gestor", "usuario"] as const;
const VALID_PLANOS = ["express", "premium"] as const;

const PROFILE_CACHE_KEY = "auth_profile";
const PROFILE_CACHE_TTL_MS = 15 * 60 * 1000;

type CachedProfile = {
  userId: string;
  role: Role;
  plano?: Plano | null;
  updatedAt: number;
};

function isRole(value: unknown): value is Role {
  return typeof value === "string" && VALID_ROLES.includes(value as Role);
}

function isPlano(value: unknown): value is Plano {
  return typeof value === "string" && VALID_PLANOS.includes(value as Plano);
}

function clearCachedProfile() {
  removeStorageItem(PROFILE_CACHE_KEY);
}

function readCachedProfile(userId: string): CachedProfile | null {
  const parsed = getStorageItem<CachedProfile>(PROFILE_CACHE_KEY);

  if (!parsed) return null;

  if (parsed.userId !== userId) return null;

  if (!isRole(parsed.role)) return null;

  const isExpired = Date.now() - parsed.updatedAt > PROFILE_CACHE_TTL_MS;
  if (isExpired) return null;

  return parsed;
}



function writeCachedProfile(profile: CachedProfile) {
  setStorageItem(PROFILE_CACHE_KEY, profile);
} 

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [plano, setPlano] = useState<Plano | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = useMemo(() => getSupabaseClient(), []);
  const currentUserIdRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const applyProfileState = (profile: {
      role: Role | null;
      plano: Plano | null;
    }) => {
      if (cancelled) return;
      setRole(profile.role);
      setPlano(profile.plano);
    };

    const clearProfileState = () => {
      if (cancelled) return;
      setRole(null);
      setPlano(null);
    };

    const fetchAndCacheProfile = async (authUser: User) => {
      const requestId = ++requestIdRef.current;

      try {
        const { data, error } = await supabase
          .from("usuarios")
          .select("role, tipo_plano")
          .eq("id", authUser.id)
          .maybeSingle();

        if (cancelled || requestId !== requestIdRef.current) return;

        if (error || !data) {
          console.warn(
            "Perfil não encontrado ou erro ao buscar perfil:",
            error,
          );
          clearProfileState();
          clearCachedProfile();
          return;
        }

        const nextRole = isRole(data.role) ? data.role : null;
        const nextPlano = isPlano(data.tipo_plano) ? data.tipo_plano : null;

        applyProfileState({
          role: nextRole,
          plano: nextPlano,
        });

        if (nextRole !== null) {
          writeCachedProfile({
            userId: authUser.id,
            role: nextRole,
            plano: nextPlano,
            updatedAt: Date.now(),
          });
        } else {
          clearCachedProfile();
          console.warn("Perfil carregado sem role válida:", { raw: data, roleRecebida: data?.role });
        }
      } catch (e) {
        if (!cancelled) {
          console.error("Erro ao carregar perfil:", e);
          clearProfileState();
          clearCachedProfile();
        }
      }
    };

    const loadAuthenticatedUser = async (authUser: User) => {
      setUser(authUser);

      const cached = readCachedProfile(authUser.id);

      if (cached) {
        applyProfileState({
          role: cached.role,
          plano: cached.plano ?? null,
        });
        setLoading(false);
        void fetchAndCacheProfile(authUser);
        return;
      }

      await fetchAndCacheProfile(authUser);
      if (!cancelled) setLoading(false);
    };

    const bootstrapFromSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (cancelled) return;

        const authUser = session?.user ?? null;
        currentUserIdRef.current = authUser?.id ?? null;

        if (!authUser) {
          setUser(null);
          clearProfileState();
          clearCachedProfile();
          setLoading(false);
          return;
        }

        await loadAuthenticatedUser(authUser);
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

      if (userChanged) {
        clearProfileState();
        clearCachedProfile();
        setLoading(true);
      }

      await loadAuthenticatedUser(nextUser);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signOut = async () => {
    try {
      clearCachedProfile();
      setUser(null);
      setRole(null);
      setPlano(null);
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
