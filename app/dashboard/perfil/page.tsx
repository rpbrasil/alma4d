"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/auth";
import { getSupabaseClient } from "@/lib/supabase/client";
import { User, Mail, Building2, Save, X } from "lucide-react";

type PerfilRow = {
  nome_completo: string | null;
  email: string | null;
  telefone: string | null;
  cliente_id: string | null;
};

type ClienteRow = {
  nome: string | null;
};

function isValidEmailLoose(email: string) {
  const s = (email ?? "").trim();
  if (!s) return true;
  return /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(s);
}

export default function PerfilPage() {
  const { user, usuarioId, role, plano } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [perfil, setPerfil] = useState<PerfilRow | null>(null);
  const [clienteNome, setClienteNome] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const displayName = useMemo(() => {
    const n = (perfil?.nome_completo ?? "").trim();
    return n || "Usuário";
  }, [perfil?.nome_completo]);

  // Helper to extract phone from auth user
  function getAuthPhoneValue() {
    type MaybePhone = {
      phone?: string;
      user_metadata?: Record<string, unknown>;
    };
    const u = user as unknown as MaybePhone;
    if (u?.phone && typeof u.phone === "string") return u.phone;
    if (u?.user_metadata && typeof u.user_metadata["phone"] === "string")
      return u.user_metadata["phone"] as string;
    return "";
  }

  const authEmail = user?.email ?? "";
  const authPhone = getAuthPhoneValue();
  const hasPendingEmail =
    !!perfil && !!perfil.email && perfil.email !== authEmail;
  const hasPendingPhone =
    !!perfil && !!perfil.telefone && perfil.telefone !== authPhone;

  useEffect(() => {
    if (!usuarioId) return;

    (async () => {
      setMsg(null);

      const { data, error } = await supabase
        .from("usuarios")
        .select("nome_completo, email, cliente_id, telefone")
        .eq("id", usuarioId)
        .single();

      if (error || !data) {
        setMsg("Não foi possível carregar seu perfil.");
        return;
      }

      const row = data as PerfilRow;

      setPerfil(row);
      setEmail(row.email ?? user?.email ?? "");
      setPhone(row.telefone ?? "");

      if (row.cliente_id) {
        const { data: cli } = (await supabase
          .from("clientes")
          .select("nome")
          .eq("id", row.cliente_id)
          .maybeSingle()) as { data: ClienteRow | null };

        setClienteNome(cli?.nome ?? null);
      }
    })();
  }, [usuarioId, supabase, user?.email]);

  async function onSave() {
    setMsg(null);

    const emailTrim = email.trim();

    if (!isValidEmailLoose(emailTrim)) {
      setMsg("E-mail inválido.");
      return;
    }

    if (!usuarioId) return;

    setSaving(true);

    try {
      const currentAuthEmail = user?.email ?? "";

      // Email flow: trigger Auth change so confirmation is sent. Do NOT write
      // `pending_email` to `usuarios` here because column may not exist.
      if (emailTrim && emailTrim !== currentAuthEmail) {
        const { error: authErr } = await supabase.auth.updateUser({
          email: emailTrim,
        } as { email?: string });

        if (authErr) throw authErr;

        // Update local view; finalization of domain record should be
        // performed by webhook or an explicit confirm endpoint.
        setPerfil((prev) => (prev ? { ...prev, email: emailTrim } : prev));

        // Inform user but keep session active so they can correct typos.
        setMsg(
          "E-mail alterado. Enviamos um e-mail de confirmação; confirme para concluir. Você pode reenviar ou editar enquanto estiver logado.",
        );
      }

      // Phone flow
      // Safely extract phone from supabase `user` shape without using `any`
      type MaybePhone = {
        phone?: string;
        user_metadata?: Record<string, unknown>;
      };
      const u = user as unknown as MaybePhone;
      let currentAuthPhone = "";
      if (u?.phone && typeof u.phone === "string") currentAuthPhone = u.phone;
      else if (u?.user_metadata && typeof u.user_metadata["phone"] === "string")
        currentAuthPhone = u.user_metadata["phone"] as string;
      const phoneTrim = phone.trim();
      if (phoneTrim && phoneTrim !== currentAuthPhone) {
        const { error: authErr } = await supabase.auth.updateUser({
          phone: phoneTrim,
        } as { phone?: string });

        if (authErr) throw authErr;

        // Do not write `pending_phone` to `usuarios` because the column
        // may not exist in all deployments. Rely on Auth confirmation
        // flows and webhook to finalize domain records.
        setPerfil((prev) => (prev ? { ...prev, telefone: phoneTrim } : prev));
      }
      setEditing(false);
    } catch (e: unknown) {
      if (e instanceof Error) {
        const raw = e.message.toLowerCase();

        if (raw.includes("usuarios_email_unique")) {
          setMsg("Este e-mail já está em uso.");
        } else {
          setMsg(e.message);
        }
      } else {
        setMsg("Erro ao salvar perfil.");
      }
    } finally {
      setSaving(false);
    }
  }

  function onCancel() {
    setEditing(false);
    setEmail(perfil?.email ?? "");
    setMsg(null);
  }

  async function revokeOtherSessions() {
    setMsg(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const access = sessionData?.session?.access_token ?? null;

      // decode token payload to extract potential session id claims
      let currentSessionId: string | null = null;
      if (access) {
        try {
          const parts = access.split(".");
          if (parts.length === 3) {
            const payload = JSON.parse(
              Buffer.from(parts[1], "base64url").toString("utf-8"),
            );
            currentSessionId =
              payload.sid || payload.session_id || payload.jti || null;
          }
        } catch {
          currentSessionId = null;
        }
      }

      const body: Record<string, unknown> = { user_id: usuarioId };
      if (currentSessionId) body.current_session_id = currentSessionId;

      const { ok, error } = await fetch("/api/usuarios/revoke-other-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then(async (r) => {
        const j = await r.json().catch(() => ({}));
        return { ok: j.ok === true, error: j.error ?? null };
      });

      if (!ok) throw new Error(error ?? "Erro ao revogar sessões");

      setMsg("Outras sessões revogadas com sucesso.");
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Erro ao revogar sessões");
    }
  }

  async function resendConfirmation() {
    setMsg(null);
    try {
      const res = await fetch("/api/usuarios/resend-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: usuarioId, type: "email" }),
      });

      const j = await res.json().catch(() => ({}));
      if (j.ok) setMsg(j.notice ?? "Confirmação reenviada.");
      else setMsg(j.error ?? "Erro ao reenviar confirmação.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro ao reenviar confirmação");
    }
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <section className="rounded-3xl border border-border bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="inline-flex items-center rounded-full bg-brand/10 px-3 py-1 text-sm font-semibold text-brand">
              <User className="mr-2 h-4 w-4" />
              Meu perfil
            </span>

            <h1 className="mt-4 text-3xl font-semibold text-slate-900">
              Informações da conta
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Gerencie suas informações básicas de acesso.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Perfil</p>
              <p className="mt-2 text-2xl font-semibold capitalize">
                {role ?? "—"}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Plano</p>
              <p className="mt-2 text-2xl font-semibold capitalize">
                {plano ?? "—"}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Empresa</p>
              <p className="mt-2 text-2xl font-semibold">
                {clienteNome
                  ? clienteNome.split(" ").slice(0, 2).join(" ")
                  : "—"}
              </p>
            </div>
          </div>
        </div>

        {msg && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <div className="flex items-center justify-between">
              <div>{msg}</div>
              {perfil?.email && role !== "usuario" && (
                <div className="ml-4 flex gap-2">
                  <button
                    className="rounded-full border px-3 py-1 text-sm"
                    onClick={() => setEditing(true)}
                  >
                    Editar
                  </button>
                  <button
                    className="rounded-full bg-brand px-3 py-1 text-sm text-white"
                    onClick={revokeOtherSessions}
                  >
                    Revogar outras sessões
                  </button>
                </div>
              )}
              {/* If there's a pending email or phone for this user, allow resending */}
              {hasPendingEmail && (
                <div className="ml-4 flex gap-2">
                  <button
                    className="rounded-full border px-3 py-1 text-sm"
                    onClick={() => resendConfirmation()}
                  >
                    Reenviar confirmação (e-mail)
                  </button>
                </div>
              )}

              {hasPendingPhone && (
                <div className="ml-4 flex gap-2">
                  <button
                    className="rounded-full border px-3 py-1 text-sm"
                    onClick={async () => {
                      setMsg(null);
                      try {
                        const res = await fetch(
                          "/api/usuarios/resend-confirmation",
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              user_id: usuarioId,
                              type: "phone",
                            }),
                          },
                        );

                        const j = await res.json().catch(() => ({}));
                        if (j.ok) setMsg(j.notice ?? "SMS reenviado.");
                        else setMsg(j.error ?? "Erro ao reenviar SMS.");
                      } catch (e) {
                        setMsg(
                          e instanceof Error
                            ? e.message
                            : "Erro ao reenviar SMS",
                        );
                      }
                    }}
                  >
                    Reenviar confirmação (SMS)
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
      {/* CARD */}
      <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Dados do usuário</h2>

          {!editing ? (
            // Only allow entering edit mode if caller is not a plain 'usuario'
            role !== "usuario" ? (
              <button
                onClick={() => setEditing(true)}
                className="rounded-full border px-4 py-2 text-sm"
              >
                Editar
              </button>
            ) : (
              <div />
            )
          ) : (
            <div className="flex gap-2">
              <button
                onClick={onSave}
                disabled={saving}
                className="rounded-full bg-brand px-4 py-2 text-sm text-white"
              >
                <Save size={16} />
              </button>

              <button
                onClick={onCancel}
                className="rounded-full border px-4 py-2 text-sm"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <p className="text-xs text-slate-500">Nome</p>
            <p className="text-sm font-semibold">{displayName}</p>
          </div>

          {role !== "usuario" && (
            <div>
              <label className="text-xs text-slate-500 flex items-center gap-2">
                <Mail size={14} />
                E-mail
              </label>

              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!editing}
                className="mt-1 w-full h-10 rounded-lg border px-3 text-sm"
                placeholder="seuemail@empresa.com"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-slate-500 flex items-center gap-2">
              <Building2 size={14} />
              Empresa
            </label>

            <div className="mt-1 h-10 rounded-lg border bg-slate-50 px-3 text-sm flex items-center">
              {clienteNome ? clienteNome.split(" ").slice(0, 2).join(" ") : "—"}
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs text-slate-500">
              Telefone de login (OTP)
            </label>

            {editing ? (
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full h-10 rounded-lg border px-3 text-sm"
                placeholder="+5511999999999"
              />
            ) : (
              <div className="mt-1 h-10 rounded-lg border bg-slate-50 px-3 text-sm flex items-center">
                {perfil?.telefone ?? "—"}
              </div>
            )}
          </div>
        </div>
      </section>
      {/* ✅ LINKS LEGAIS */}
      <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">
          Informações legais
        </h2>

        <div className="mt-3 flex flex-col gap-2 text-sm">
          <a
            href="/nr1/privacidade"
            className="text-brand underline hover:opacity-80"
          >
            Política de Privacidade
          </a>

          <a
            href="/nr1/termos"
            className="text-brand underline hover:opacity-80"
          >
            Termos de Uso
          </a>
        </div>
      </section>
    </div>
  );
}
