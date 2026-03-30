export default function AppPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "radial-gradient(circle at top, #111827 0%, #0b1220 60%)",
      }}
    >
      <div
        style={{
          width: "min(520px, 96vw)",
          aspectRatio: "375 / 812",
          borderRadius: 56,
          overflow: "hidden",
          boxShadow:
            "0 40px 120px rgba(0,0,0,.6), inset 0 0 0 1px rgba(255,255,255,.08)",
          background: "#000",
        }}
      >
        <iframe
          src="http://alma4d.com.br/alma4dweb"
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            background: "#fff",
          }}
          allow="clipboard-write; fullscreen"
        />
      </div>

      <div
        style={{
          position: "fixed",
          bottom: 24,
          fontSize: 12,
          color: "#cbd5f5",
          opacity: 0.7,
        }}
      >
        Use o mouse como toque
      </div>
    </main>
  );
}