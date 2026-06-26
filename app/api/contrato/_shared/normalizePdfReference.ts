/**
 * Normalises a PDF storage reference to a relative Supabase Storage path.
 *
 * Handles:
 *  1. Supabase signed URLs  (contain /sign/)
 *  2. Full https URLs       (extract path starting from "contratos/")
 *  3. Relative paths that accidentally start with a UUID (corrupted path — tries to recover)
 *  4. Normal relative paths (returned as-is)
 */
export function normalizePdfReference(value: string | null): string | null {
  if (!value) return null;

  const v = value.trim();

  if (v.startsWith("http")) {
    try {
      const parsed = new URL(v);
      const segments = parsed.pathname.split("/").filter(Boolean);

      // Supabase signed URL: /storage/v1/sign/<bucket>/<path>
      const signIndex = segments.findIndex((s) => s === "sign");
      if (signIndex >= 0 && segments.length > signIndex + 2) {
        return decodeURIComponent(segments.slice(signIndex + 2).join("/"));
      }

      // Generic URL — extract from "contratos/" onwards
      const contratoIndex = segments.findIndex((s) => s === "contratos");
      if (contratoIndex >= 0) {
        return segments.slice(contratoIndex).join("/");
      }

      return v;
    } catch {
      return v;
    }
  }

  // Corrupted relative path that starts with a UUID instead of "clientes/"
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

  if (uuidPattern.test(v)) {
    const parts = v.split("/");
    const contratoIndex = parts.findIndex((p) => p === "contratos");
    if (contratoIndex > 0) {
      return ["clientes", parts[0], ...parts.slice(contratoIndex)].join("/");
    }
  }

  return v;
}
