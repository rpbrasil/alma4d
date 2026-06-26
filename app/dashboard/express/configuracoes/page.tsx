"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth";
import { Save, ImageIcon, Link2 } from "lucide-react";
import Image from "next/image";
import { AlertCircle } from "lucide-react";

export default function ConfiguracoesPage() {
  const { role, clienteId, loading } = useAuth();

  const [logoUrl, setLogoUrl] = useState("");
  const [menuUrl, setMenuUrl] = useState("");
  const [menuLabel, setMenuLabel] = useState("");
  const [logoPreviewError, setLogoPreviewError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [toastError, setToastError] = useState(false);

  useEffect(() => {
    if (!clienteId) return;
    fetch("/api/clientes/configuracoes")
      .then((r) => r.json())
      .then((json) => {
        if (json.ok && json.data) {
          setLogoUrl(json.data.logo_url ?? "");
          setMenuUrl(json.data.menu_url ?? "");
          setMenuLabel(json.data.menu_label ?? "");
        }
      })
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [clienteId]);

  function showToast(msg: string, isError = false) {
    setToast(msg);
    setToastError(isError);
    setTimeout(() => setToast(null), 2500);
  }

  function isValidUrl(val: string) {
    if (!val) return true;
    try {
      new URL(val);
      return true;
    } catch {
      return false;
    }
  }

  async function handleSave() {
    if (!isValidUrl(logoUrl)) {
      showToast("URL do logotipo inválida.", true);
      return;
    }
    if (!isValidUrl(menuUrl)) {
      showToast("Link do menu inválido.", true);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/clientes/configuracoes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logo_url: logoUrl || null,
          menu_url: menuUrl || null,
          menu_label: menuLabel || null,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error((json as { error?: string }).error ?? "Erro ao salvar");
      }

      showToast("Configurações salvas com sucesso!");
      setLogoPreviewError(false);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro ao salvar", true);
    } finally {
      setSaving(false);
    }
  }

  if (loading || (!!clienteId && fetching)) {
    return <div className="text-slate-500 text-sm py-8">Carregando...</div>;
  }

  if (role !== "cliente") {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <AlertCircle className="mx-auto mb-2 text-yellow-500" size={24} />
        <p className="text-yellow-800 font-semibold">
          Acesso restrito ao cliente
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Configurações</h1>
        <p className="text-sm text-slate-500 mt-1">
          Personalize conforme identidade e conteúdo da sua empresa e melhore a experiência dos seus colaboradores.
        </p>
      </div>

      {/* Identidade Visual */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
          <ImageIcon size={18} className="text-slate-500" />
          Identidade Visual
        </h2>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            URL do Logotipo
          </label>
          <input
            type="url"
            value={logoUrl}
            onChange={(e) => {
              setLogoUrl(e.target.value);
              setLogoPreviewError(false);
            }}
            placeholder="https://suaempresa.com/logo.png"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#030870]/30"
          />
          <p className="text-xs text-slate-500">
            Aparece no cabeçalho do painel e nos relatórios. Deixe em
            branco para usar o logo padrão alma4D.
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Formatos aceitos: PNG, SVG, JPG, WebP &mdash; tamanho recomendado:
            até 200&nbsp;KB, proporção horizontal (ex: 300&times;80&nbsp;px).
          </p>

          {logoUrl && isValidUrl(logoUrl) && !logoPreviewError && (
            <div className="mt-2 inline-flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="text-xs text-slate-400">Prévia:</span>
              <Image
                src={logoUrl}
                alt="Prévia do logotipo"
                width={100}
                height={40}
                className="max-h-10 w-auto object-contain"
                onError={() => setLogoPreviewError(true)}
                unoptimized
              />
            </div>
          )}
          {logoUrl && logoPreviewError && (
            <p className="text-xs text-red-500">
              Não foi possível carregar a imagem desta URL.
            </p>
          )}
        </div>
      </div>

      {/* Link do Menu */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
          <Link2 size={18} className="text-slate-500" />
          Link do Menu
        </h2>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Nome exibido no menu
            </label>
            <input
              type="text"
              value={menuLabel}
              onChange={(e) => setMenuLabel(e.target.value.slice(0, 60))}
              placeholder="Portal RH"
              maxLength={60}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#030870]/30"
            />
            <p className="text-xs text-slate-500">
              Texto que aparecerá no menu lateral. Máximo 60 caracteres. Deixe
              em branco para usar &ldquo;Acesso externo&rdquo;.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              URL do link
            </label>
            <input
              type="url"
              value={menuUrl}
              onChange={(e) => setMenuUrl(e.target.value)}
              placeholder="https://seulink.suaempresa.com.br"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#030870]/30"
            />
            <p className="text-xs text-slate-500">
              Endereço que será aberto ao clicar no link. Use para apontar para
              um portal interno, sistema próprio ou página relevante da sua empresa. O link abrirá em nova aba para não interromper o painel. Deixe em branco
              se não quiser exibir o link.
            </p>
          </div>
        </div>
      </div>

      {/* Salvar */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-[#030870] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#030870]/90 disabled:opacity-60 transition-opacity"
        >
          {saving && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          <Save size={16} />
          {saving ? "Salvando..." : "Salvar Configurações"}
        </button>

        <div className="min-h-8">
          {toast && (
            <span
              className={`inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold ${
                toastError
                  ? "bg-red-100 text-red-700"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {toast}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
