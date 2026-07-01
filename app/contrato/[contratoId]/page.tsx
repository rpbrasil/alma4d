"use client";

import Image from "next/image";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  FileText,
  RefreshCw,
} from "lucide-react";

type ContratoStatus = {
  id: string;
  numero_contrato: string;
  versao: number;
  status: string;
  tipo_contrato: string;
  criado_em: string;
  atualizado_em: string;
  pdf_url: string | null;
  pdf_assinado_url: string | null;
  forma_pagamento: string | null;
  pagarme_order_id: string | null;
  pagarme_payment_status: string | null;
  valor_total: number | string | null;
  valor_mensal: number | string | null;
};

function formatDate(v: string) {
  try {
    return new Date(v).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return v;
  }
}

function formatCurrency(v: number | string | null) {
  if (v == null) return null;
  const n = Number(v);
  if (isNaN(n)) return null;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ContratoDetalhesPage({
  params,
}: {
  params: Promise<{ contratoId: string }>;
}) {
  const { contratoId } = use(params);

  const [contrato, setContrato] = useState<ContratoStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryMsg, setRetryMsg] = useState<string | null>(null);

  const fetchContrato = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/contrato/status?contratoId=${encodeURIComponent(contratoId)}`,
        { credentials: "include", cache: "no-store" },
      );
      const data = (await res.json()) as { contrato: ContratoStatus | null };
      if (!data.contrato) {
        setNotFound(true);
      } else {
        setContrato(data.contrato);
        setNotFound(false);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContrato();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contratoId]);

  const hasPdf = Boolean(contrato?.pdf_assinado_url || contrato?.pdf_url);
  const pdfPending = !hasPdf && contrato?.pagarme_payment_status === "paid";

  const handleOpenPdf = async () => {
    try {
      const res = await fetch(
        `/api/contrato/pdf-url?contratoId=${encodeURIComponent(contratoId)}`,
        { cache: "no-store" },
      );
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url)
        throw new Error(data.error ?? "Erro ao obter URL");
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao abrir PDF");
    }
  };

  const handleRetry = async () => {
    setRetrying(true);
    setRetryMsg(null);
    try {
      const res = await fetch("/api/contrato/retentar-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ contratoId }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setRetryMsg(data.error ?? "Erro ao tentar gerar PDF.");
      } else {
        await fetchContrato();
      }
    } catch (err) {
      setRetryMsg(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #ffffff 0%, #f7f7fb 100%)",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto",
        color: "#171717",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          borderBottom: "1px solid #e7e7f2",
          padding: "20px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#ffffff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Image
            src="/images/alma4d_express_nobground.png"
            alt="alma4D"
            width={120}
            height={36}
            style={{ height: 36, width: "auto" }}
          />
          <div style={{ fontSize: 12, color: "#64748b" }}>
            Detalhes do contrato
          </div>
        </div>

        <Link
          href="/dashboard/express/documentos"
          style={{ fontSize: 12, color: "#030870", textDecoration: "none" }}
        >
          ← Voltar para documentos
        </Link>
      </div>

      {/* CONTEÚDO */}
      <div style={{ maxWidth: 720, margin: "40px auto", padding: "0 16px" }}>
        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: 48,
              color: "#64748b",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <RefreshCw
              size={28}
              style={{ animation: "spin 1s linear infinite" }}
            />
            Carregando contrato...
          </div>
        ) : notFound || !contrato ? (
          <div
            style={{
              background: "#fff",
              border: "1px solid #e7e7f2",
              borderRadius: 16,
              padding: 32,
              boxShadow: "0 20px 60px rgba(3,8,112,0.08)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 48 }}>❌</div>
            <h1
              style={{
                marginTop: 12,
                color: "#df633f",
                fontWeight: 900,
                fontSize: 22,
              }}
            >
              Contrato não encontrado
            </h1>
            <p style={{ marginTop: 8, fontSize: 14, color: "#64748b" }}>
              Não foi possível localizar este contrato ou você não tem permissão
              para visualizá-lo.
            </p>
            <div
              style={{
                marginTop: 16,
                fontSize: 12,
                color: "#94a3b8",
                wordBreak: "break-all",
              }}
            >
              ID: {contratoId}
            </div>
          </div>
        ) : (
          <div
            style={{
              background: "#fff",
              border: "1px solid #e7e7f2",
              borderRadius: 16,
              padding: 28,
              boxShadow: "0 20px 60px rgba(3,8,112,0.08)",
            }}
          >
            {/* HEADER DO CARD */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <FileText size={20} color="#030870" />
                <span
                  style={{ fontWeight: 700, fontSize: 18, color: "#0f172a" }}
                >
                  {contrato.numero_contrato}
                </span>
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "4px 10px",
                  borderRadius: 999,
                  background:
                    contrato.status === "ativo"
                      ? "#dcfce7"
                      : contrato.status === "encerrado"
                        ? "#fee2e2"
                        : "#f1f5f9",
                  color:
                    contrato.status === "ativo"
                      ? "#15803d"
                      : contrato.status === "encerrado"
                        ? "#b91c1c"
                        : "#475569",
                }}
              >
                {contrato.status.charAt(0).toUpperCase() +
                  contrato.status.slice(1)}
              </span>
            </div>

            {/* GRID DE DETALHES */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                marginBottom: 20,
              }}
            >
              {[
                {
                  label: "Tipo",
                  value: contrato.tipo_contrato?.replace(/_/g, " ") ?? "-",
                },
                { label: "Versão", value: `v${contrato.versao}` },
                { label: "Criado em", value: formatDate(contrato.criado_em) },
                {
                  label: "Pagamento",
                  value:
                    contrato.pagarme_payment_status === "paid"
                      ? "✅ Confirmado"
                      : (contrato.pagarme_payment_status ?? "-"),
                },
                {
                  label: "Valor",
                  value:
                    formatCurrency(
                      contrato.valor_mensal ?? contrato.valor_total,
                    ) ?? "-",
                },
                {
                  label: "Forma de pagamento",
                  value: contrato.forma_pagamento?.toUpperCase() ?? "-",
                },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div
                    style={{ fontSize: 11, color: "#64748b", marginBottom: 2 }}
                  >
                    {label}
                  </div>
                  <div
                    style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {/* PDF SECTION */}
            <div
              style={{
                borderTop: "1px solid #e7e7f2",
                paddingTop: 20,
                textAlign: "center",
              }}
            >
              {hasPdf ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      color: "#15803d",
                    }}
                  >
                    <CheckCircle size={18} />
                    <span style={{ fontSize: 14, fontWeight: 600 }}>
                      PDF disponível
                    </span>
                  </div>
                  <button
                    onClick={handleOpenPdf}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      background: "#030870",
                      color: "#fff",
                      padding: "12px 20px",
                      borderRadius: 10,
                      fontWeight: 700,
                      fontSize: 14,
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    <Eye size={16} />
                    Abrir contrato oficial
                  </button>
                  {retryMsg && (
                    <p style={{ fontSize: 12, color: "#b91c1c", margin: 0 }}>
                      {retryMsg}
                    </p>
                  )}
                  <button
                    onClick={handleRetry}
                    disabled={retrying}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: "transparent",
                      color: retrying ? "#94a3b8" : "#64748b",
                      padding: "6px 12px",
                      borderRadius: 8,
                      fontWeight: 600,
                      fontSize: 12,
                      border: "1px solid #e2e8f0",
                      cursor: retrying ? "not-allowed" : "pointer",
                    }}
                  >
                    <RefreshCw
                      size={13}
                      style={
                        retrying
                          ? { animation: "spin 1s linear infinite" }
                          : undefined
                      }
                    />
                    {retrying ? "Regenerando..." : "Regenerar PDF"}
                  </button>
                </div>
              ) : pdfPending ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      color: "#b45309",
                    }}
                  >
                    <Clock size={18} />
                    <span style={{ fontSize: 14, fontWeight: 600 }}>
                      PDF em geração
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
                    Pagamento confirmado. Clique em &quot;Gerar PDF agora&quot;
                    para forçar a geração.
                  </p>
                  {retryMsg && (
                    <p style={{ fontSize: 12, color: "#b91c1c", margin: 0 }}>
                      {retryMsg}
                    </p>
                  )}
                  <button
                    onClick={handleRetry}
                    disabled={retrying}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      background: retrying ? "#e2e8f0" : "#030870",
                      color: retrying ? "#94a3b8" : "#fff",
                      padding: "10px 18px",
                      borderRadius: 10,
                      fontWeight: 700,
                      fontSize: 13,
                      border: "none",
                      cursor: retrying ? "not-allowed" : "pointer",
                    }}
                  >
                    <RefreshCw
                      size={15}
                      style={
                        retrying
                          ? { animation: "spin 1s linear infinite" }
                          : undefined
                      }
                    />
                    {retrying ? "Gerando..." : "Gerar PDF agora"}
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "#94a3b8",
                    justifyContent: "center",
                  }}
                >
                  <AlertCircle size={16} />
                  <span style={{ fontSize: 13 }}>
                    PDF não disponível. Aguarde a confirmação do pagamento ou{" "}
                    <a
                      href="/contato"
                      style={{ color: "#030870", fontWeight: 600 }}
                    >
                      contate o suporte
                    </a>
                    .
                  </span>
                </div>
              )}
            </div>

            {/* RODAPÉ DE VERIFICAÇÃO */}
            <div
              style={{
                marginTop: 24,
                padding: "12px 16px",
                borderRadius: 12,
                background: "rgba(3,8,112,0.04)",
                border: "1px solid rgba(3,8,112,0.2)",
                fontSize: 12,
                color: "#0f172a",
              }}
            >
              <strong>Verificação segura:</strong>
              <ul style={{ marginTop: 6, paddingLeft: 16, marginBottom: 0 }}>
                <li>Este documento foi gerado pela plataforma alma4D</li>
                <li>O acesso é protegido por autenticação</li>
                <li style={{ wordBreak: "break-all" }}>ID: {contrato.id}</li>
              </ul>
            </div>
          </div>
        )}

        <div
          style={{
            textAlign: "center",
            fontSize: 12,
            color: "#94a3b8",
            marginTop: 24,
          }}
        >
          Plataforma alma4D • Contratos digitais seguros
        </div>
      </div>
    </div>
  );
}
