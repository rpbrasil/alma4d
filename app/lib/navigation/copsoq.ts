export function buildCopsoqHref(linkId?: string | null) {
  if (linkId && linkId.trim()) {
    return `/express/copsoq?linkId=${encodeURIComponent(linkId.trim())}`;
  }

  return null;
}

export function buildAcessoBasicoHref(
  step: 1 | 2 | 3 = 1,
  params?: {
    origem?: string | null;
    linkId?: string | null;
    respondido?: boolean | null;
  },
) {
  const search = new URLSearchParams();
  search.set("step", String(step));

  if (params?.origem) search.set("origem", params.origem);
  if (params?.linkId) search.set("linkId", params.linkId);
  if (typeof params?.respondido === "boolean") {
    search.set("respondido", params.respondido ? "1" : "0");
  }

  return `/dashboard/express/acesso-basico?${search.toString()}`;
}
