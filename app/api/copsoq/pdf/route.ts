// Playwright-based PDF generation disabled.
// This stub prevents the server from importing Playwright and causing startup failures
// while we run the app on the built-in Node runtime. Use the client-side print fallback
// or re-enable server-side PDF in a Playwright-capable container later.

export async function POST(_: Request) {
  const message = {
    error:
      "Server-side PDF generation is disabled. Use client-side print fallback.",
  };

  return new Response(JSON.stringify(message), {
    status: 501,
    headers: { "Content-Type": "application/json" },
  });
}
