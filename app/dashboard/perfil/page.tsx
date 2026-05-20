"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/auth";
import { supabase } from "@/lib/supabase/client";
import { User, Mail, Phone, Building2, Save, X, Camera } from "lucide-react";

type PerfilRow = {
  nome_completo: string | null;
  email: string | null;
  telefone_contato: string | null;
  avatar_url: string | null;
  cliente_id: string | null;
};

function onlyDigits(v: string) {
  return (v ?? "").replace(/\D/g, "");
}

function isValidEmailLoose(email: string) {
  const s = (email ?? "").trim();
  if (!s) return true; // opcional
  return /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(s);
}

function formatPhoneBR(raw: string) {
  const d = onlyDigits(raw).slice(0, 11);
  if (d.length <= 2) return d;
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  if (rest.length <= 8) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function PerfilPage() {
  const { user, role, plano } = useAuth();

  const [perfil, setPerfil] = useState<PerfilRow | null>(null);
  const [clienteNome, setClienteNome] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState("");
  const [telefoneContato, setTelefoneContato] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const displayName = useMemo(() => {
    const n = (perfil?.nome_completo ?? "").trim();
    return n || "Usuário";
  }, [perfil?.nome_completo]);

  const initials = useMemo(() => initialsFromName(displayName), [displayName]);

  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;

    (async () => {
      setMsg(null);

      const { data, error } = await supabase
        .from("usuarios")
        .select(
          "nome_completo, email, telefone_contato, avatar_url, cliente_id",
        )
        .eq("id", user.id)
        .single();

      if (!mounted) return;

      if (error || !data) {
        setMsg("Não foi possível carregar seu perfil.");
        setPerfil(null);
        return;
      }

      const row = data as PerfilRow;
      setPerfil(row);
      setEmail(row.email ?? "");
      setTelefoneContato(row.telefone_contato ?? "");
      setAvatarUrl(row.avatar_url ?? null);

      if (row.cliente_id) {
        const { data: cli } = await supabase
          .from("clientes")
          .select("nome")
          .eq("id", row.cliente_id)
          .single();

        if (!mounted) return;
        setClienteNome((cli as any)?.nome ?? null);
      } else {
        setClienteNome(null);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  async function onSave() {
    setMsg(null);

    const emailTrim = email.trim();
    if (!isValidEmailLoose(emailTrim)) {
      setMsg("E-mail inválido.");
      return;
    }

    const telDigits = onlyDigits(telefoneContato);
    if (
      telefoneContato.trim() &&
      (telDigits.length < 10 || telDigits.length > 11)
    ) {
      setMsg("Telefone inválido. Informe DDD + número (10–11 dígitos).");
      return;
    }

    if (!user?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("usuarios")
        .update({
          email: emailTrim || null,
          telefone_contato: telDigits ? telDigits : null,
          avatar_url: avatarUrl,
        })
        .eq("id", user.id);

      if (error) {
        // Se bater unique do email: vai dar erro do Postgres (23505)
        throw error;
      }

      setPerfil((prev) =>
        prev
          ? {
              ...prev,
              email: emailTrim || null,
              telefone_contato: telDigits ? telDigits : null,
              avatar_url: avatarUrl,
            }
          : prev,
      );

      setEditing(false);
      setMsg("Perfil atualizado com sucesso.");
    } catch (e: any) {
      // mensagem amigável para duplicidade
      const raw = String(e?.message ?? "");
      if (raw.toLowerCase().includes("usuarios_email_unique")) {
        setMsg("Este e-mail já está em uso.");
      } else {
        setMsg(raw || "Erro ao salvar perfil.");
      }
    } finally {
      setSaving(false);
    }
  }

  function onCancel() {
    setMsg(null);
    setEditing(false);
    setEmail(perfil?.email ?? "");
    setTelefoneContato(perfil?.telefone_contato ?? "");
    setAvatarUrl(perfil?.avatar_url ?? null);
  }

  async function onPickAvatar(file: File) {
    if (!user?.id) return;
    setMsg(null);
    setSaving(true);

    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `user-${user.id}/avatar.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = pub.publicUrl;

      setAvatarUrl(url);
      setMsg("Avatar atualizado. Clique em Salvar para confirmar.");
      setEditing(true);
    } catch {
      setMsg(
        "Não foi possível enviar o avatar (verifique bucket/policies do Storage).",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* HERO */}
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
              Atualize seus dados de contato e personalize seu avatar.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Perfil</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 capitalize">
                {role ?? "—"}
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Plano</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 capitalize">
                {plano ?? "—"}
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Empresa</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {clienteNome ?? "—"}
              </p>
            </div>
          </div>
        </div>

        {msg && (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            {msg}
          </div>
        )}
      </section>

      {/* CARD */}
      <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Dados do usuário
          </h2>

          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Editar
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-60"
              >
                <Save size={16} />
                Salvar
              </button>
              <button
                type="button"
                onClick={onCancel}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
              >
                <X size={16} />
                Cancelar
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
          {/* Avatar */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-900">Avatar</p>

            <div className="mt-4 flex items-center gap-4">
              <div className="relative h-16 w-16 overflow-hidden rounded-full bg-white border border-slate-200 flex items-center justify-center">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt="Avatar"
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                ) : (
                  <span className="text-lg font-extrabold text-slate-700">
                    {initials}
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900">
                  {displayName}
                </p>
                <p className="text-xs text-slate-500">ID: {user?.id ?? "—"}</p>
              </div>
            </div>

            <div className="mt-4">
              <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
                <Camera size={16} />
                Trocar foto
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={saving}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void onPickAvatar(file);
                  }}
                />
              </label>
              <p className="mt-2 text-xs text-slate-500">
                Requer bucket <b>avatars</b> no Supabase Storage.
              </p>
            </div>
          </div>

          {/* Campos */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <p className="text-xs text-slate-500">Nome</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {perfil?.nome_completo ?? "—"}
                </p>
              </div>

              <div>
                <label className="text-xs text-slate-500 flex items-center gap-2">
                  <Mail size={14} /> E-mail (contato)
                </label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!editing || saving}
                  placeholder="seuemail@empresa.com"
                  className="mt-1 w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 flex items-center gap-2">
                  <Phone size={14} /> Telefone (contato)
                </label>
                <input
                  value={formatPhoneBR(telefoneContato)}
                  onChange={(e) =>
                    setTelefoneContato(onlyDigits(e.target.value))
                  }
                  disabled={!editing || saving}
                  placeholder="(11) 99999-9999"
                  inputMode="numeric"
                  className="mt-1 w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm disabled:bg-slate-50"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs text-slate-500 flex items-center gap-2">
                  <Phone size={14} /> Telefone de login (OTP)
                </label>
                <div className="mt-1 w-full h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm flex items-center text-slate-700">
                  {user?.phone ?? "—"}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Este telefone é usado no login por SMS e não é alterado aqui.
                </p>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs text-slate-500 flex items-center gap-2">
                  <Building2 size={14} /> Empresa
                </label>
                <div className="mt-1 w-full h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm flex items-center text-slate-700">
                  {clienteNome ?? "—"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
