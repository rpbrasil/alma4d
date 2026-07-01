import Image from "next/image";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export default async function Page({
  params,
}: {
  params: Promise<{ contratoId: string }>;
}) {
  const { contratoId } = await params;

  const supabase = getSupabaseAdmin();

  const { data: contrato } = await supabase
    .from("contratos")
    .select(
      "id, numero_contrato, status, tipo_contrato, versao, criado_em, aceite_termos_em",
    )
    .eq("id", contratoId)
    .maybeSingle();

  const isValid = !!contrato && contrato.status === "ativo";

  function formatDate(v: string | null) {
    if (!v) return null;
    try {
      return new Date(v).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return v;
    }
  }

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
            Verificação de contrato
          </div>
        </div>
        <div style={{ fontSize: 12, color: "#64748b" }}>
          Plataforma segura • Dados protegidos
        </div>
      </div>

      {/* CONTEÚDO */}
      <div style={{ maxWidth: 600, margin: "48px auto", padding: "0 16px" }}>
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
          {/* STATUS ICON */}
          <div style={{ fontSize: 52 }}>{isValid ? "✅" : "❌"}</div>

          <h1
            style={{
              marginTop: 12,
              color: isValid ? "#019499" : "#df633f",
              fontWeight: 900,
              fontSize: 22,
            }}
          >
            {isValid ? "Contrato verificado" : "Contrato não encontrado"}
          </h1>

          <p style={{ marginTop: 8, fontSize: 14, color: "#64748b" }}>
            {isValid
              ? "Este documento foi emitido e está ativo na plataforma alma4D."
              : "Não foi possível localizar este contrato. O documento pode ser inválido ou ter sido revogado."}
          </p>

          {/* DADOS DO CONTRATO */}
          {contrato && (
            <div
              style={{
                marginTop: 24,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                textAlign: "left",
              }}
            >
              {[
                { label: "Nº do contrato", value: contrato.numero_contrato },
                {
                  label: "Situação",
                  value:
                    contrato.status === "ativo"
                      ? "✅ Ativo"
                      : contrato.status === "encerrado"
                        ? "❌ Encerrado"
                        : contrato.status,
                },
                {
                  label: "Tipo",
                  value: contrato.tipo_contrato?.replace(/_/g, " ") ?? "-",
                },
                { label: "Versão", value: `v${contrato.versao}` },
                {
                  label: "Data do aceite",
                  value: formatDate(contrato.aceite_termos_em) ?? "-",
                },
                {
                  label: "ID do documento",
                  value: contrato.id,
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
                    style={{
                      fontSize: 11,
                      color: "#64748b",
                      marginBottom: 2,
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 12,
                      color: "#0f172a",
                      wordBreak: "break-all",
                    }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* BLOCO DE SEGURANÇA */}
          <div
            style={{
              marginTop: 24,
              padding: 14,
              borderRadius: 12,
              background: "rgba(3,8,112,0.04)",
              border: "1px solid rgba(3,8,112,0.2)",
              fontSize: 13,
              color: "#0f172a",
              textAlign: "left",
            }}
          >
            <strong>Verificação segura:</strong>
            <ul style={{ marginTop: 8, marginBottom: 0 }}>
              <li>Este documento foi gerado pela plataforma alma4D</li>
              <li>
                O aceite foi registrado com IP, data/hora e hash criptográfico
              </li>
              <li>
                A autenticidade pode ser confirmada nesta página a qualquer
                momento
              </li>
            </ul>
          </div>
        </div>

        <div
          style={{
            textAlign: "center",
            fontSize: 12,
            color: "#94a3b8",
            marginTop: 24,
          }}
        >
          Sistema de validação de contratos • alma4D
        </div>
      </div>
    </div>
  );
}
