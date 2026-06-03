const CACHE_NAME = "alma4d-v1";

const STATIC_ASSETS = [
    "/",
    "/dashboard",
    "/app.webmanifest",
    "/icons/icon-192.png",
    "/icons/icon-512.png"
];

// ✅ INSTALAR
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
});

// ✅ ATIVAR
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) return caches.delete(key);
                })
            )
        )
    );
});

// ✅ FETCH (controle de requisições)
self.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url);

    // 🔒 NÃO INTERFERE EM API (muito importante)
    if (url.pathname.startsWith("/api")) return;

    // 🔒 NÃO CACHEAR SUPABASE
    if (url.hostname.includes("supabase")) return;

    // 🔥 Estratégia: network first
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                const copy = response.clone();

                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, copy);
                });

                return response;
            })
            .catch(() => caches.match(event.request))
    );
});