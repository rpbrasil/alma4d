export default function DebugSSR() {
  return (
    <div style={{ padding: 40 }}>
      <h1>DEBUG SSR ATIVO</h1>
      <p>Se você está vendo isso, o Next.js está rodando em SSR.</p>
      <p>Timestamp: {new Date().toISOString()}</p>
    </div>
  );
}
