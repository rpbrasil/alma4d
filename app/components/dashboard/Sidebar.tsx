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
  AlertTriangle,
  ExternalLink,
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
      href: "/dashboard/admin/contratos",
      label: "Contratos",
      icon: FileText,
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
      href: "/dashboard/express/acesso-basico?step=1",
      label: "Canal seguro",
      icon: ShieldCheck,
      roles: ["usuario", "admin", "gestor"],
    },
    {
      href: "/dashboard/express/relatorio-ocorrencias",
      label: "Relatório de R&O",
      icon: AlertTriangle,
      roles: ["admin", "cliente"],
    },
    {
      href: "/dashboard/express/acompanhamento",
      label: "Acompanhamento",
      icon: ClipboardList,
      roles: ["admin", "gestor", "usuario"],
    },
    {
      href: "/dashboard/admin/parceiros",
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
      href: "/dashboard/express/configuracoes",
      label: "Configurações",
      icon: Settings,
      roles: ["cliente"],
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

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, signOut, plano, role, clienteId } = useAuth();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuUrl, setMenuUrl] = useState<string | null>(null);
  const [menuLabel, setMenuLabel] = useState<string>("Acesso externo");

  const [copsoqStatus, setCopsoqStatus] = useState<{
    status: string;
    href: string | null;
  } | null>(null);

  const effectivePlano = (plano ?? "express") as Plano;

  const displayName = user?.nome || "Usuário";

  const planItems = useMemo(() => {
    if (!effectivePlano) return [];
    return NAV_BY_PLAN[effectivePlano] ?? [];
  }, [effectivePlano]);

  const items = useMemo(() => {
    if (!role) return [];

    return planItems
      .filter((item) => item.roles.includes(role))
      .map((item) => {
        if (item.href === "/dashboard/express/copsoq") {
          if (copsoqStatus?.status === "pending") {
            return { ...item, label: "Questionário disponível" };
          }

          if (copsoqStatus?.status === "answered") {
            return { ...item, label: "Questionário respondido" };
          }
        }

        return item;
      });
  }, [planItems, role, copsoqStatus]);

  const isActive = (href: string) => {
    if (href === "/dashboard/express" || href === "/dashboard/premium") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  useEffect(() => {
    const canFetch =
      (role === "cliente" || role === "gestor" || role === "usuario") &&
      !!clienteId;
    if (!canFetch) return;
    fetch("/api/clientes/configuracoes")
      .then((r) => r.json())
      .then((json) => {
        setMenuUrl(json?.data?.menu_url ?? null);
        setMenuLabel(json?.data?.menu_label || "Acesso externo");
      })
      .catch(() => setMenuUrl(null));
  }, [role, clienteId]);

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

      if (role === "usuario") {
        router.replace("/login/usuario");
      } else {
        router.replace("/login");
      }
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

  return (
    <div suppressHydrationWarning>
      {/* ✅ OVERLAY FORA DO ASIDE */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* ✅ SIDEBAR */}
      <aside
        id="dashboard-sidebar"
        role="navigation"
        className={[
          "bg-brand text-white w-64 shrink-0",
          "fixed inset-y-0 left-0 z-50",
          "transform transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0",
        ].join(" ")}
      >
        <div className="h-screen flex flex-col">
          <div className="px-5 py-4 border-b border-white/10">
            <Link
              href="/dashboard"
              className="flex items-center gap-3"
              onClick={onClose}
            >
              <div className="relative flex items-center gap-3">
                {/* LOGO */}
                <div className="relative h-12 w-12 rounded-full overflow-hidden">
                  <Image
                    src="/images/alma4d-round-512.png"
                    alt="alma4D"
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
                {/* EXPRESS */}
                <span className="absolute left-5 top-8 bottom-0 text-[13px] italic text-brand-accent">
                  express
                </span>
              </div>
              <p className="text-sm font-semibold">{displayName}</p>
            </Link>
          </div>

          <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
            {items.map((item: NavItem) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose} // ✅ fecha ao clicar ✅
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
            {menuUrl && (
              <a
                href={menuUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/75 hover:text-white hover:bg-white/8"
              >
                <ExternalLink size={18} />
                {menuLabel}
              </a>
            )}
          </nav>

          <div className="px-3 py-3 border-t border-white/10 space-y-1">
            <Link
              href="/dashboard/perfil"
              onClick={onClose}
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

      {/* ✅ MODAL */}
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
