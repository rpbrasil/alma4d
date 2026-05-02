"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/context/auth";

import { criarUsuarioAdmin } from "./actions";
import { listarClientesParaFiltro, type Role } from "../actions";
import { useState, useMemo, useEffect, useTransition } from "react";

type ClienteOption = { id: string; nome: string };
type Mode = "invite" | "temporary_password";

function onlyDigits(v: string) {
  return (v || "").replace(/\D+/g, "");
}

function isEmail(v: string) {
  const s = v.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function isPhoneBR(v: string) {
  const d = onlyDigits(v);
  return d.length === 10 || d.length === 11;
}

export default function NovoUsuarioAdminPage() {
  const router = useRouter();
  const { role } = useAuth();
  const isAdmin = role === "admin";

  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(true);

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form (campos realmente usados agora)
  const [clienteId, setClienteId] = useState("");
  const [userRole, setUserRole] = useState<Role>("usuario");
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");

  const [mode] = useState<Mode>("invite");
  const [tempPassword] = useState("");

  // Opcional
  const [gestorId] = useState("");

  const canSubmit = useMemo(() => {
    if (!clienteId || !nomeCompleto.trim()) return false;

    const hasEmail = !!email.trim();
    const hasPhone = !!telefone.trim();

    if (!hasEmail && !hasPhone) return false;
    if (hasEmail && !isEmail(email)) return false;
    if (hasPhone && !isPhoneBR(telefone)) return false;
    if (mode === "temporary_password" && tempPassword.trim().length < 8)
      return false;

    return true;
  }, [clienteId, nomeCompleto, email, telefone, mode, tempPassword]);

  useEffect(() => {
    if (!isAdmin) return;

    let mounted = true;
    (async () => {
      setLoadingClientes(true);
      try {
        const list = await listarClientesParaFiltro();
        if (mounted) setClientes(list);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Erro ao carregar clientes.");
      } finally {
        if (mounted) setLoadingClientes(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <AlertCircle className="mx-auto text-yellow-600 mb-2" size={24} />
        <p className="text-yellow-800 font-semibold">
          Acesso restrito a administradores
        </p>
      </div>
    );
  }

  function onSubmit() {
    setError("");
    setSuccess("");

    if (!canSubmit) {
      setError("Revise os campos obrigatórios.");
      return;
    }

    const fd = new FormData();
    fd.set("cliente_id", clienteId);
    fd.set("role", userRole);
    fd.set("nome_completo", nomeCompleto.trim());
    fd.set("mode", mode);

    if (email) fd.set("email", email.trim().toLowerCase());
    if (telefone) fd.set("telefone", onlyDigits(telefone));
    if (gestorId) fd.set("gestor_id", gestorId);
    if (mode === "temporary_password") fd.set("password", tempPassword.trim());

    startTransition(async () => {
      try {
        await criarUsuarioAdmin(fd);
        setSuccess(
          mode === "invite"
            ? "Convite enviado e usuário criado com sucesso."
            : "Usuário criado com senha temporária.",
        );
        router.push("/dashboard/admin/usuarios");
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Erro ao criar usuário.");
      }
    });
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-extrabold">Novo Usuário</h1>
          <p className="text-sm text-gray-600">
            Criação completa: Auth + usuários + organização
          </p>
        </div>

        <Link
          href="/dashboard/admin/usuarios"
          className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50"
        >
          <ArrowLeft size={16} />
          Voltar
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-2 items-center">
          <Check size={18} className="text-green-600" />
          <p className="text-green-800 text-sm">{success}</p>
        </div>
      )}

      <div className="bg-white border rounded-2xl p-6 space-y-5">
        <div className="grid md:grid-cols-2 gap-4">
          <select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            className="border rounded-lg px-3 py-2"
            disabled={loadingClientes}
          >
            <option value="">
              {loadingClientes ? "Carregando..." : "Selecione um cliente"}
            </option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>

          <select
            value={userRole}
            onChange={(e) => setUserRole(e.target.value as Role)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="usuario">Usuário</option>
            <option value="gestor">Gestor</option>
            <option value="cliente">Cliente</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <input
          value={nomeCompleto}
          onChange={(e) => setNomeCompleto(e.target.value)}
          className="border rounded-lg px-3 py-2 w-full"
          placeholder="Nome completo"
        />

        <div className="grid md:grid-cols-2 gap-4">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border rounded-lg px-3 py-2"
            placeholder="E-mail"
          />

          <input
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            className="border rounded-lg px-3 py-2"
            placeholder="Telefone"
          />
        </div>

        <div className="flex gap-4">
          <button
            className={`px-4 py-2 rounded-lg font-semibold text-white ${
              !canSubmit || pending
                ? "bg-gray-400"
                : "bg-[#019499] hover:bg-[#017a7d]"
            }`}
            disabled={!canSubmit || pending}
            onClick={onSubmit}
          >
            {pending && (
              <Loader2 size={16} className="animate-spin inline mr-2" />
            )}
            Criar usuário
          </button>
        </div>
      </div>
    </div>
  );
}