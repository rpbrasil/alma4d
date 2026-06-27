import { NextResponse } from "next/server";

// Private / link-local CIDRs that must never be proxied (SSRF protection)
const BLOCKED_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
  /\.local$/i,
  /\.internal$/i,
];

const ALLOWED_CONTENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

// GET /api/proxy-image?url=<encoded-url>
// Server-side image proxy so canvas-based PDF export can load logos from
// external domains that don't serve Access-Control-Allow-Origin headers.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  // Validate the URL
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return NextResponse.json(
      { error: "Only http/https allowed" },
      { status: 400 },
    );
  }

  const hostname = parsed.hostname;
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(hostname)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  try {
    const upstream = await fetch(url, {
      headers: { Accept: "image/*" },
      // 5 s timeout
      signal: AbortSignal.timeout(5000),
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream ${upstream.status}` },
        { status: upstream.status },
      );
    }

    const contentType = upstream.headers.get("Content-Type") ?? "";
    const baseType = contentType.split(";")[0].trim().toLowerCase();

    if (!ALLOWED_CONTENT_TYPES.includes(baseType)) {
      return NextResponse.json(
        { error: "Upstream is not an image" },
        { status: 415 },
      );
    }

    const buffer = await upstream.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("[proxy-image]", err);
    return NextResponse.json({ error: "Proxy error" }, { status: 502 });
  }
}
