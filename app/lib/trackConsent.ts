import { supabaseBrowser as supabase } from "@/lib/supabase/browser";

type TrackConsentParams = {
  type: string; // ex: "copsoq_departamento"
  version: string; // ex: "v1.0"
  action?: "accepted" | "declined";
  page?: string;
  metadata?: Record<string, unknown>;
};

export async function trackConsent({
  type,
  version,
  action = "accepted",
  page,
  metadata = {},
}: TrackConsentParams) {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      console.warn("Sem token - consent não registrado");
      return;
    }

    await fetch("/api/consent", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type,
        version,
        action,
        page,
        metadata,
      }),
    });
  } catch (err) {
    console.error("Erro ao registrar consentimento:", err);
  }
}
