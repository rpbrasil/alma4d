const CACHE_NAME = "alma4d-v1";

const STATIC_ASSETS = [
    "/",
    "/dashboard",
    "/app.webmanifest",
    "/icons/icon-192.png",
    "/icons/icon-512.png",
    "/icons/icon-512-maskable.png"
];

// ✅ INSTALAR
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

// ✅ ATIVAR
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) return caches.delete(key);
                    return Promise.resolve();
                })
            )
        )
    );
    self.clients.claim();
});

// ✅ FETCH (controle de requisições)
self.addEventListener("fetch", (event) => {
    const request = event.request;

    if (request.method !== "GET") return;

    const url = new URL(request.url);

    if (url.origin !== self.location.origin) return;
    if (url.pathname.startsWith("/api")) return;
    if (url.hostname.includes("supabase")) return;

    // 🔥 Estratégia: network first
    event.respondWith(
        fetch(request)
            .then((response) => {
                const responseClone = response.clone();

                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(request, responseClone);
                });

                return response;
            })
            .catch(async () => {
                const cachedResponse =
                    (await caches.match(request)) ||
                    (request.mode === "navigate" && (await caches.match("/dashboard"))) ||
                    (await caches.match("/"));

                return (
                    cachedResponse ||
                    new Response("Service Unavailable", {
                        status: 503,
                        statusText: "Service Unavailable",
                        headers: { "Content-Type": "text/plain" },
                    })
                );
            })
    );
});