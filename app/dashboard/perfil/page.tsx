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

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const displayName = useMemo(() => {
    const n = (perfil?.nome_completo ?? "").trim();
    return n || "Usuário";
  }, [perfil?.nome_completo]);

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
      // If user changed their own email, update Auth first so confirmation flow
      // is triggered (email confirmation required). Then sync to `usuarios`.
      const currentAuthEmail = user?.email ?? "";

      if (emailTrim && emailTrim !== currentAuthEmail) {
        const { error: authErr } = await supabase.auth.updateUser({
          email: emailTrim,
        } as any);

        if (authErr) throw authErr;

        // inform user to confirm new email
        setMsg(
          "E-mail alterado. Enviamos um e-mail de confirmação; confirme para concluir.",
        );
      }

      // Always sync `usuarios.email` (allow empty => null)
      const { error } = await supabase
        .from("usuarios")
        .update({ email: emailTrim || null })
        .eq("id", usuarioId);

      if (error) throw error;

      setPerfil((prev) => (prev ? { ...prev, email: emailTrim } : prev));
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
            {msg}
          </div>
        )}
      </section>
      {/* CARD */}
      <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Dados do usuário</h2>

          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="rounded-full border px-4 py-2 text-sm"
            >
              Editar
            </button>
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

            <div className="mt-1 h-10 rounded-lg border bg-slate-50 px-3 text-sm flex items-center">
              {perfil?.telefone ?? "—"}
            </div>
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
