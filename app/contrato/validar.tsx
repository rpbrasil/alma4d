import Image from "next/image";

export default async function Page({
  params,
}: {
  params: { contratoId: string };
}) {
  const contratoId = params.contratoId;

  // ✅ chama seu endpoint existente
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/contrato/pdf-url?contratoId=${contratoId}`,
    { cache: "no-store" },
  );

  const data = await res.json();

  const isValid = !!data.url;

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
            style={{ height: 36 }}
          />
          <div>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              Verificação de contrato
            </div>
          </div>
        </div>

        <div style={{ fontSize: 12, color: "#64748b" }}>
          Plataforma segura • Dados protegidos
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            Documento validado digitalmente
          </div>
        </div>
      </div>

      {/* CONTEÚDO */}
      <div
        style={{
          maxWidth: 720,
          margin: "40px auto",
          padding: "0 16px",
        }}
      >
        <div
          style={{
            background: "#fff",
            border: "1px solid #e7e7f2",
            borderRadius: 16,
            padding: 28,
            boxShadow: "0 20px 60px rgba(3,8,112,0.08)",
            textAlign: "center",
          }}
        >
          {/* STATUS */}
          <div style={{ fontSize: 48 }}>{isValid ? "✅" : "❌"}</div>

          <h1
            style={{
              marginTop: 12,
              color: isValid ? "#019499" : "#df633f",
              fontWeight: 900,
              fontSize: 22,
            }}
          >
            {isValid ? "Contrato válido" : "Contrato não encontrado"}
          </h1>

          <p
            style={{
              marginTop: 8,
              fontSize: 14,
              color: "#64748b",
            }}
          >
            {isValid
              ? "Este documento foi verificado na plataforma alma4D."
              : "Não foi possível validar este contrato."}
          </p>

          {/* ID */}
          <div
            style={{
              marginTop: 20,
              fontSize: 12,
              color: "#64748b",
              wordBreak: "break-all",
            }}
          >
            ID do contrato:
            <div style={{ fontWeight: 700, color: "#0f172a" }}>
              {contratoId}
            </div>
          </div>

          {/* BOTÃO PDF */}
          {isValid && (
            <a
              href={data.url}
              target="_blank"
              style={{
                marginTop: 24,
                display: "inline-block",
                background: "#030870",
                color: "#fff",
                padding: "14px 22px",
                borderRadius: 10,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Abrir contrato oficial
            </a>
          )}

          {/* BLOCO DE SEGURANÇA */}
          <div
            style={{
              marginTop: 28,
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
            <ul style={{ marginTop: 8 }}>
              <li>Este documento foi gerado pela plataforma alma4D</li>
              <li>O acesso é protegido por URL temporária</li>
              <li>Os dados são registrados no momento do aceite</li>
            </ul>
          </div>
        </div>

        {/* FOOTER */}
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
