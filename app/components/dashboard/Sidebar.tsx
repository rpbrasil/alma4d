"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  Settings,
  User,
  LogOut,
  LucideIcon,
  FileText,
  ClipboardList,
  QrCode,
  Home,
  Users,
  UserX,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { useAuth, Role } from "@/context/auth";
import { clearAlma4dStorage } from "@/lib/storage";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
};

type Plano = "express" | "premium";

const NAV_BY_PLAN: Record<Plano, NavItem[]> = {
  express: [
    {
      href: "/dashboard/express",
      label: "Inclusão de usuários",
      icon: Home,
      roles: ["admin", "cliente"],
    },
    {
      href: "/dashboard/admin/clientes",
      label: "Clientes",
      icon: Users,
      roles: ["admin"],
    },
    {
      href: "/dashboard/express/documentos",
      label: "Documentos",
      icon: FileText,
      roles: ["admin", "cliente"],
    },
    {
      href: "/dashboard/express/copsoq",
      label: "Acesso ao Questionário",
      icon: QrCode,
      roles: ["admin", "cliente"],
    },
    {
      href: "/dashboard/express/acesso-basico?step=2",
      label: "Canal seguro",
      icon: ShieldCheck,
      roles: ["usuario", "cliente", "admin", "gestor"],
    },
    {
      href: "/dashboard/express/parceiros",
      label: "Parceiros",
      icon: Users,
      roles: ["admin"],
    },
    {
      href: "/dashboard/express/relatorio-copsoq",
      label: "Relatório NR-1 | Psicossocial",
      icon: ClipboardList,
      roles: ["admin", "cliente"],
    },
    {
      href: "/dashboard/admin/financeiro",
      label: "Financeiro",
      icon: BarChart3,
      roles: ["admin"],
    },
    {
      href: "/dashboard/admin/deletar-usuario",
      label: "Deletar usuário",
      icon: UserX,
      roles: ["admin"],
    },
  ],
  premium: [
    {
      href: "/dashboard/premium",
      label: "Visão geral",
      icon: LayoutDashboard,
      roles: ["admin", "cliente", "gestor"],
    },
    {
      href: "/dashboard/premium/relatorios",
      label: "Relatórios",
      icon: BarChart3,
      roles: ["admin", "cliente", "gestor"],
    },
    {
      href: "/dashboard/admin/usuarios",
      label: "Usuários",
      icon: Users,
      roles: ["admin", "cliente", "gestor"],
    },
    {
      href: "/dashboard/admin/clientes",
      label: "Clientes",
      icon: Users,
      roles: ["admin"],
    },
    {
      href: "/dashboard/premium/profissionais",
      label: "Profissionais",
      icon: Users,
      roles: ["admin", "cliente", "gestor"],
    },
    {
      href: "/dashboard/premium/configuracoes",
      label: "Configurações",
      icon: Settings,
      roles: ["admin", "cliente", "gestor"],
    },
    {
      href: "/dashboard/admin/financeiro",
      label: "Financeiro",
      icon: BarChart3,
      roles: ["admin"],
    },
    {
      href: "/dashboard/admin/deletar-usuario",
      label: "Deletar usuário",
      icon: UserX,
      roles: ["admin"],
    },
  ],
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, signOut, plano, role } = useAuth();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [isOpen] = useState(false);
  const [copsoqStatus, setCopsoqStatus] = useState<{
    status: string;
    href: string | null;
  } | null>(null);

  const effectivePlano = plano as Plano;

  const displayName = user?.nome || "Usuário";

  const planItems = useMemo(() => {
    if (!effectivePlano) return [];
    return NAV_BY_PLAN[effectivePlano] ?? [];
  }, [effectivePlano]);

  const items = useMemo<NavItem[]>(() => {
    if (!role) return [];
    return planItems.filter((item) => item.roles.includes(role));
  }, [planItems, role]);

  const isActive = (href: string) => {
    if (href === "/dashboard/express" || href === "/dashboard/premium") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await fetch("/api/copsoq/status", {
          method: "GET",
          cache: "no-store",
        });

        const data = await res.json();

        if (data?.ok) {
          setCopsoqStatus(data);
        }
      } catch (e) {
        console.error(e);
      }
    }

    loadStatus();
  }, []);

  async function handleLogout() {
    try {
      setLoggingOut(true);

      await signOut();
      clearAlma4dStorage();
      sessionStorage.clear();

      router.push("/");
    } catch (e) {
      console.error("Erro ao sair:", e);
    } finally {
      setLoggingOut(false);
      setConfirmOpen(false);
    }
  }

  if (loading) {
    return (
      <div className="w-64 bg-brand text-white flex items-center justify-center">
        <span className="text-sm opacity-70">Carregando...</span>
      </div>
    );
  }

  if (!user) return null;

  const copsoqNavItem =
    copsoqStatus?.status === "pending" || copsoqStatus?.status === "answered"
      ? {
          href: copsoqStatus.href || "/dashboard/express/acesso-basico?step=3",
          label:
            copsoqStatus.status === "pending"
              ? "Questionário disponível"
              : "Questionário respondido",
          icon: QrCode,
          highlight: copsoqStatus.status === "pending",
        }
      : null;

  return (
    <div suppressHydrationWarning>
      <aside
        className={[
          "bg-brand text-white w-64 shrink-0",
          "fixed inset-y-0 left-0 z-40",
          "transform transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0",
        ].join(" ")}
      >
        <div className="h-screen flex flex-col">
          <div className="px-5 py-4 border-b border-white/10">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="relative h-12 w-12 rounded-full overflow-hidden">
                <Image
                  src="/images/alma4d-round-512.png"
                  alt="alma4D"
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </div>
              <p className="text-sm font-semibold">{displayName}</p>
            </Link>
          </div>

          <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
            {copsoqNavItem?.highlight && (
              <span className="ml-auto text-xs bg-green-500 px-2 py-0.5 rounded">
                Novo
              </span>
            )}
            {copsoqNavItem && (
              <Link
                href={copsoqNavItem.href}
                className={[
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm",
                  copsoqNavItem.highlight
                    ? "bg-green-500/20 text-white animate-pulse"
                    : "bg-white/10 text-white",
                ].join(" ")}
              >
                <QrCode size={18} />
                {copsoqNavItem.label}
              </Link>
            )}

            {items.map((item: NavItem) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm",
                    active
                      ? "bg-white/12 text-white"
                      : "text-white/75 hover:text-white hover:bg-white/8",
                  ].join(" ")}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="px-3 py-3 border-t border-white/10 space-y-1">
            <Link
              href="/dashboard/perfil"
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-white/80 hover:bg-white/10"
            >
              <User size={18} />
              Meu perfil
            </Link>

            <button
              onClick={() => setConfirmOpen(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-300 hover:bg-red-500/10"
            >
              <LogOut size={18} />
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* ✅ MODAL FUNCIONANDO */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              Confirmar saída
            </h3>

            <p className="mt-2 text-sm text-slate-600">
              Tem certeza que deseja sair da sua conta?
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                className="px-4 py-2 text-sm rounded-lg border border-slate-200"
              >
                Cancelar
              </button>

              <button
                disabled={loggingOut}
                onClick={handleLogout}
                className="px-4 py-2 text-sm rounded-lg bg-orange-600 text-white flex items-center gap-2"
              >
                {loggingOut && (
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                )}
                {loggingOut ? "Saindo..." : "Sair"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
