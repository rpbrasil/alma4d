"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/browser";
import Image from "next/image";
import {
  AlertCircle,
  QrCode,
  Link as LinkIcon,
  Copy,
  Share2,
  ExternalLink,
  Mail,
  RefreshCw,
  Printer,
  Users,
  CheckCircle2,
} from "lucide-react";
import { toDataURL } from "qrcode";

type ContratoLite = {
  id: string;
  numero_contrato: string;
  status: "rascunho" | "ativo" | "suspenso" | "encerrado";
  limite_usuarios: number | null;
};

type LinkInfo = {
  contratoId: string;
  linkId: string;
  url: string;
  maxRespostas: number;
  usadas: number;
};

type CreateLinkResponse =
  | {
      ok: true;
      linkId: string;
      contratoId: string;
      maxRespostas: number;
      usadas: number;
      url: string;
    }
  | { error: string };

function statusLabel(status: ContratoLite["status"]) {
  const labels: Record<ContratoLite["status"], string> = {
    rascunho: "Rascunho",
    ativo: "Ativo",
    suspenso: "Suspenso",
    encerrado: "Encerrado",
  };
  return labels[status];
}

function waLink(url: string) {
  // curto e objetivo
  const msg = `COPSOQ (riscos psicossociais): responda pelo link (login necessário): ${url}`;
  return `https://wa.me/?text=${encodeURIComponent(msg)}`;
}

function mailtoLink(url: string) {
  const subject =
    "Convite obrigatório — Questionário COPSOQ (Riscos Psicossociais)";

  const body =
    `Prezada(o),\n\n` +
    `Você está convidada(o) a responder ao Questionário COPSOQ (Copenhagen Psychosocial Questionnaire), ` +
    `utilizado para o mapeamento de riscos psicossociais relacionados ao trabalho.\n\n` +
    `Este levantamento integra o Gerenciamento de Riscos Ocupacionais (GRO) e o Programa de Gerenciamento de Riscos (PGR), ` +
    `em alinhamento às diretrizes da NR-1.\n\n` +
    `A participação é obrigatória para os colaboradores elegíveis, conforme comunicação interna da organização.\n\n` +
    `Sigilo e respeito à individualidade: as respostas serão tratadas com confidencialidade e analisadas de forma agregada, ` +
    `com foco em prevenção e melhoria nas condições de trabalho. Este instrumento não possui finalidade clínica individual.\n\n` +
    `Acesse pelo link (login com seu celular necessário):\n${url}\n\n` +
    `Atenciosamente,\n` +
    `Equipe de SST / RH\n`;

  // IMPORTANTÍSSIMO: aqui é "&body=" (não "&amp;body=")
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function DashboardExpressCopsoqPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [contratos, setContratos] = useState<ContratoLite[]>([]);
  const [contratoId, setContratoId] = useState<string>("");
  const [campaign, setCampaign] = useState<string>("");

  const [creating, setCreating] = useState(false);
  const [linkInfo, setLinkInfo] = useState<LinkInfo | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<
    "init" | "session" | "usuario" | "cliente" | "contratos" | "done"
  >("init");

  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [clienteNome, setClienteNome] = useState<string | null>(null);
  const qrRef = useRef<HTMLDivElement | null>(null);

  // 1) carregar contratos elegíveis (somente o necessário)
  useEffect(() => {
    let cancelled = false;

    // Se algo travar, a página sai do loading e mostra erro útil
    const watchdog = window.setTimeout(() => {
      if (!cancelled) {
        setError(
          `Tempo excedido ao carregar (etapa: ${phase}). Verifique conexão com Supabase.`,
        );
        setLoading(false);
      }
    }, 8000);

    type GetSessionResult = Awaited<
      ReturnType<typeof supabase.auth.getSession>
    >;

    async function getSessionSafe(): Promise<GetSessionResult> {
      return await Promise.race<GetSessionResult>([
        supabase.auth.getSession(),
        new Promise<GetSessionResult>((_, reject) => {
          window.setTimeout(() => reject(new Error("timeout session")), 3000);
        }),
      ]);
    }

    (async () => {
      try {
        setLoading(true);
        setError(null);

        setPhase("session");
        const { data: sessionData, error: sessionErr } =
          await getSessionSafe();
        if (sessionErr) throw sessionErr;

        const userId = sessionData.session?.user?.id;
        if (!userId) {
          setError("Usuário não autenticado.");
          return;
        }

        setPhase("usuario");
        const { data: usuario, error: userError } = await supabase
          .from("usuarios")
          .select("cliente_id")
          .eq("id", userId)
          .single();

        if (userError || !usuario?.cliente_id) {
          setError("Cliente não associado.");
          return;
        }

        setPhase("cliente");
        const { data: cliente, error: clienteError } = await supabase
          .from("clientes")
          .select("ativo, nome") // <-- se você já adicionou nome
          .eq("id", usuario.cliente_id)
          .single();

        if (clienteError) {
          setError("Erro ao validar cliente.");
          return;
        }

        // se estiver usando clienteNome, set aqui
        setClienteNome(cliente?.nome ?? null);

        if (cliente?.ativo === false) {
          setError("Cliente inativo. Acesso bloqueado.");
          return;
        }

        setPhase("contratos");
        const { data: contratosData, error: contratosError } = await supabase
          .from("contratos")
          .select("id,numero_contrato,status,limite_usuarios")
          .eq("cliente_id", usuario.cliente_id)
          .order("criado_em", { ascending: false });

        if (contratosError) throw contratosError;

        const lista = (contratosData || []) as ContratoLite[];
        const elegiveis = lista.filter(
          (c) =>
            String(c.status).toLowerCase() === "ativo" &&
            (c.limite_usuarios ?? 0) > 0,
        );

        setContratos(elegiveis);
        if (!contratoId && elegiveis.length === 1)
          setContratoId(elegiveis[0].id);

        setPhase("done");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar.");
      } finally {
        window.clearTimeout(watchdog);
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(watchdog);
    };
    // ⚠️ phase fica fora do deps para não resetar o watchdog; supabase já é estável pelo useMemo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  // 2) gerar QR local (em alta resolução, mas exibido menor)
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!linkInfo?.url) {
        setQrDataUrl(null);
        return;
      }
      try {
        const dataUrl = await toDataURL(linkInfo.url, {
          margin: 2,
          width: 480, // gera maior (boa impressão) e renderiza menor
          errorCorrectionLevel: "M",
        });
        if (alive) setQrDataUrl(dataUrl);
      } catch {
        if (alive) setQrDataUrl(null);
      }
    })();

    return () => {
      alive = false;
    };
  }, [linkInfo?.url]);

  const contratoSelecionado = useMemo(
    () => contratos.find((c) => c.id === contratoId) || null,
    [contratos, contratoId],
  );

  const respondidos = linkInfo?.usadas ?? null;
  const limite =
    contratoSelecionado?.limite_usuarios ?? linkInfo?.maxRespostas ?? null;
  const restantes =
    respondidos != null && limite != null
      ? Math.max(0, Number(limite) - Number(respondidos))
      : null;

  async function gerarLink() {
    if (!contratoId) {
      setToast("Selecione um contrato para gerar o link.");
      setTimeout(() => setToast(null), 2000);
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const response = await fetch("/api/copsoq/create-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          contratoId,
          campaign: campaign.trim() ? campaign.trim() : undefined,
        }),
      });

      const data = (await response
        .json()
        .catch(() => ({}))) as CreateLinkResponse;

      if (!response.ok || !("ok" in data) || data.ok !== true) {
        const msg =
          "error" in data
            ? data.error
            : `Erro ao gerar link (${response.status})`;
        throw new Error(msg);
      }

      setLinkInfo({
        contratoId: data.contratoId,
        linkId: data.linkId,
        url: data.url,
        maxRespostas: Number(data.maxRespostas ?? 0),
        usadas: Number(data.usadas ?? 0),
      });

      setToast(
        `Link gerado • Respondidos: ${data.usadas} / ${data.maxRespostas}`,
      );
      setTimeout(() => setToast(null), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao gerar link.");
    } finally {
      setCreating(false);
    }
  }

  async function atualizarContagem() {
    // Só permite atualizar depois de gerar
    if (!contratoId || !linkInfo?.linkId) return;

    try {
      setCreating(true);
      setError(null);

      // chama o mesmo endpoint, mas NÃO altera o link local
      const response = await fetch("/api/copsoq/create-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ contratoId }),
      });

      const data = (await response
        .json()
        .catch(() => ({}))) as CreateLinkResponse;

      if (!response.ok || !("ok" in data) || data.ok !== true) {
        const msg =
          "error" in data
            ? data.error
            : `Erro ao atualizar (${response.status})`;
        throw new Error(msg);
      }

      // mantém url / linkId do estado atual (não muda campanha nem link)
      setLinkInfo((prev) =>
        prev
          ? {
              ...prev,
              maxRespostas: Number(data.maxRespostas ?? prev.maxRespostas ?? 0),
              usadas: Number(data.usadas ?? prev.usadas ?? 0),
            }
          : {
              contratoId: data.contratoId,
              linkId: data.linkId,
              url: data.url,
              maxRespostas: Number(data.maxRespostas ?? 0),
              usadas: Number(data.usadas ?? 0),
            },
      );

      setToast(
        `Atualizado • Respondidos: ${data.usadas} / ${data.maxRespostas}`,
      );
      setTimeout(() => setToast(null), 2200);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha ao atualizar contagem.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function copiar() {
    if (!linkInfo?.url) return;
    try {
      await navigator.clipboard.writeText(linkInfo.url);
      setCopied(true);
      setToast("Link copiado!");
      window.setTimeout(() => {
        setToast(null);
        setCopied(false);
      }, 1600);
    } catch {
      window.prompt("Copie o link:", linkInfo.url);
    }
  }

  async function compartilhar() {
    if (!linkInfo?.url) return;

    const shareData = {
      title: "COPSOQ — Questionário de Riscos Psicossociais",
      text: "Responda ao COPSOQ (login necessário).",
      url: linkInfo.url,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // fallback
      }
    }
    await copiar();
  }

  function imprimir() {
    window.print();
  }

  // ----------- estados -----------

  if (loading) {
    return (
      <section className="rounded-3xl border border-border bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          {/* <p className="text-slate-600">Carregando dados...</p> */}
          <p className="text-slate-600">
            Carregando dados…{" "}
            <span className="text-xs text-slate-500">
              (
              {phase === "session"
                ? "sessão"
                : phase === "usuario"
                  ? "usuário"
                  : phase === "cliente"
                    ? "cliente"
                    : phase === "contratos"
                      ? "contratos"
                      : "iniciando"}
              )
            </span>
          </p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
          <div>
            <h2 className="font-semibold text-red-900">Erro</h2>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </section>
    );
  }

  if (contratos.length === 0) {
    return (
      <section className="rounded-3xl border border-border bg-white p-8 shadow-sm">
        <div className="text-center">
          <QrCode className="mx-auto h-12 w-12 text-slate-300" />
          <h2 className="mt-4 font-semibold text-slate-700">
            Sem contrato elegível
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Para gerar links/QR do COPSOQ é necessário ter um contrato{" "}
            <strong>ativo</strong> com <strong>limite_usuarios</strong> &gt; 0.
          </p>
        </div>
      </section>
    );
  }

  // ----------- layout principal (ordem mantida) -----------

  return (
    <div className="space-y-6">
      <style jsx global>{`
        @media print {
          /* esconde tudo por padrão */
          body * {
            visibility: hidden !important;
          }

          /* mostra somente o bloco de campanha */
          .print-campaign,
          .print-campaign * {
            visibility: visible !important;
          }

          /* posiciona a campanha no topo e evita “página extra” */
          .print-campaign {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
          }

          /* garante que nada do layout normal apareça */
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* 1) CONTAGEM NO TOPO */}
      <section className="rounded-3xl border border-border bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Respostas do Questionário
            </h1>
            <p className="mt-1 text-slate-600">
              Acompanhe o limite e o total respondido. Gere o link/QR para
              divulgação.
            </p>
          </div>
          <QrCode className="h-12 w-12 text-brand/20" />
        </div>
        <div className="mt-4 min-h-4">
          {toast ? (
            <span className="inline-flex items-center rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
              {toast}
            </span>
          ) : (
            <span className="text-xs text-slate-500"> </span>
          )}
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-slate-700">
              <Users className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-semibold">Limite contratual</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {limite ?? "—"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Total de respostas permitidas
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-slate-700">
              <QrCode className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-semibold">Respondidos</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {respondidos ?? "—"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Atualiza ao gerar/atualizar
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-slate-700">
              <AlertCircle className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-semibold">Restantes</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {restantes ?? "—"}
            </p>
            <p className="mt-1 text-xs text-slate-500">limite − respondidos</p>
          </div>
        </div>
        {/* BOTÃO ATUALIZAR (REFRESH DOS NÚMEROS) */}
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={atualizarContagem}
            disabled={creating || !contratoId || !linkInfo?.linkId}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-surface-muted transition disabled:opacity-60"
            title={
              !linkInfo?.linkId
                ? "Gere o link primeiro."
                : "Atualiza os números de respostas."
            }
          >
            <RefreshCw size={16} />
            Atualizar respostas
          </button>
        </div>
      </section>

      {/* 2) GERAÇÃO DO LINK (ANTES DO QR) */}
      <section className="rounded-3xl border border-border bg-white p-8 shadow-sm no-print">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Gerar link da campanha
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Clique em <strong>Gerar</strong> para habilitar o QR Code e as
              opções de compartilhamento. Clique em <strong>Atualizar</strong>{" "}
              para atualizar apenas os números.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm text-slate-600">
              Contrato (ativo com limite)
            </label>
            <select
              value={contratoId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                setContratoId(e.target.value);
                // importante: trocar contrato “zera” o link gerado
                setLinkInfo(null);
                setQrDataUrl(null);
              }}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand/30"
            >
              <option value="" disabled>
                Selecione...
              </option>
              {contratos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.numero_contrato} — {statusLabel(c.status)} — limite:{" "}
                  {c.limite_usuarios}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500">
              Dica: se houver mais de um contrato ativo, selecione o correto
              antes de gerar.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-600">
              Identificador opcional (campanha/turma)
            </label>
            <input
              value={campaign}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setCampaign(e.target.value)
              }
              placeholder="ex.: empresa-x-maio-2026"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand/30"
            />
            <p className="text-xs text-slate-500">
              Se preenchido, entra como{" "}
              <span className="font-mono">?c=...</span> no link.
            </p>
          </div>
        </div>

        {/* botões (sem div duplicado) */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {/* 1) GERAR */}
          <button
            type="button"
            onClick={gerarLink}
            disabled={creating || !contratoId}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90 transition disabled:opacity-60"
          >
            <RefreshCw size={16} />
            {creating ? "Processando..." : "Gerar"}
          </button>
          {linkInfo?.url ? (
            <span className="inline-flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              Link gerado
            </span>
          ) : (
            <span className="text-xs text-slate-500"> </span>
          )}
        </div>
      </section>

      {/* 3) QR CENTRALIZADO + 4) LINK ABAIXO */}
      <section
        className="rounded-3xl border border-border bg-white p-8 shadow-sm print-card"
        ref={qrRef}
      >
        <div className="text-center">
          <h2 className="text-lg font-semibold text-slate-900">
            QR Code do Questionário
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Escaneie para abrir o questionário no celular (login necessário).
          </p>

          {/* Só mostra QR + ações depois de GERAR */}
          {!linkInfo?.url ? (
            <div className="mt-6 rounded-2xl border border-border bg-slate-50 p-6 text-sm text-slate-700">
              <p className="font-semibold">Ainda não há link gerado.</p>
              <p className="mt-1 text-slate-600">
                Use o botão <strong>Gerar</strong> acima para habilitar o QR
                Code e as opções de compartilhamento.
              </p>
            </div>
          ) : (
            <>
              {/* QR menor */}
              <div className="mt-6 flex justify-center">
                <div className="rounded-2xl border border-border bg-white p-4">
                  {qrDataUrl ? (
                    <Image
                      src={qrDataUrl}
                      alt="QR Code COPSOQ"
                      width={180}
                      height={180}
                      unoptimized
                      className="h-45 w-45"
                    />
                  ) : (
                    <div className="h-45 w-45 rounded-xl bg-slate-100" />
                  )}
                  <p className="mt-3 text-xs text-slate-500">
                    Use o celular para escanear.
                  </p>
                </div>
              </div>

              {/* Link abaixo */}
              <div className="mt-6 rounded-2xl border border-border bg-white p-5 text-left">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700">Link</p>
                    <p className="mt-1 break-all text-sm text-slate-800">
                      {linkInfo.url}
                    </p>
                  </div>
                  <LinkIcon className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                </div>

                <div className="mt-4 flex flex-wrap gap-2 no-print">
                  <button
                    type="button"
                    onClick={copiar}
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-surface-muted transition"
                  >
                    {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                    {copied ? "Copiado" : "Copiar"}
                  </button>

                  <button
                    type="button"
                    onClick={compartilhar}
                    className="inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand/90 transition"
                  >
                    <Share2 size={16} />
                    Compartilhar
                  </button>

                  <a
                    href={waLink(linkInfo.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-surface-muted transition"
                  >
                    <ExternalLink size={16} />
                    WhatsApp
                  </a>

                  <a
                    href={mailtoLink(linkInfo.url)}
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-surface-muted transition"
                  >
                    <Mail size={16} />
                    E-mail
                  </a>

                  <a
                    href={linkInfo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-surface-muted transition"
                  >
                    <ExternalLink size={16} />
                    Abrir
                  </a>

                  <button
                    type="button"
                    onClick={imprimir}
                    disabled={!qrDataUrl}
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-surface-muted transition disabled:opacity-60"
                  >
                    <Printer size={16} />
                    Imprimir campanha
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 5) Impressão tipo campanha (mural) */}
        <div className="print-campaign" style={{ display: "none" }}>
          <div className="p-10">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-semibold">
                  {clienteNome
                    ? `${clienteNome} — QUESTIONÁRIO COPSOQ`
                    : "QUESTIONÁRIO COPSOQ"}
                </h1>
                <p className="mt-2 text-base text-slate-700">
                  Mapeamento de fatores de riscos psicossociais relacionados ao
                  trabalho (NR‑1 / GRO / PGR).
                </p>
              </div>
              <QrCode className="h-12 w-12 text-slate-300" />
            </div>

            <div className="mt-6 text-sm text-slate-800 leading-relaxed">
              <p>
                Convidamos os colaboradores elegíveis a responderem ao
                Questionário COPSOQ (Copenhagen Psychosocial Questionnaire),
                utilizado para identificar fatores de risco psicossocial
                relacionados ao trabalho e apoiar ações de melhoria nas
                condições de trabalho.
              </p>
              <p className="mt-3">
                Este levantamento integra o Gerenciamento de Riscos Ocupacionais
                (GRO) e o Programa de Gerenciamento de Riscos (PGR), em
                alinhamento às diretrizes da NR‑1.
              </p>
              <p className="mt-3">
                <strong>Participação obrigatória</strong> conforme comunicado
                interno da organização.
              </p>
              <p className="mt-3">
                <strong>Sigilo e respeito à individualidade:</strong> suas
                respostas serão tratadas de forma confidencial e analisadas de
                maneira agregada, com foco na prevenção e melhoria
                organizacional — não se trata de diagnóstico clínico individual.
              </p>
            </div>

            <div className="mt-8 flex items-start gap-8">
              <div className="rounded-2xl border border-slate-200 p-4">
                {qrDataUrl ? (
                  <Image
                    src={qrDataUrl}
                    alt="QR Code COPSOQ"
                    width={320}
                    height={320}
                    unoptimized
                  />
                ) : null}
                <p className="mt-3 text-xs text-slate-600">
                  Escaneie o QR code para acessar (login necessário).
                </p>
              </div>

              <div className="flex-1">
                <p className="text-sm font-semibold">Link direto:</p>
                <p className="mt-1 break-all text-xs">{linkInfo?.url ?? ""}</p>
                <div className="mt-4 text-xs text-slate-600">
                  <p>Em caso de dúvidas, procure o RH / SST.</p>
                </div>
              </div>
            </div>

            <div className="mt-10 text-xs text-slate-500">
              <p>
                Referência: NR‑1 (GRO/PGR) e gestão de fatores de risco
                psicossociais relacionados ao trabalho.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
