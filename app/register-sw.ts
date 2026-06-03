export function registerServiceWorker() {
  if (typeof window === "undefined") return;

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => {
          console.log("✅ Service Worker registrado");
        })
        .catch((err) => {
          console.error("❌ Erro SW:", err);
        });
    });
  }
}
