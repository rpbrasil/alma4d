// /lib/verify-turnstile.ts
type TurnstileVerifyResult = {
  success: boolean;
  "error-codes"?: string[];
  hostname?: string;
  challenge_ts?: string;
  action?: string;
  cdata?: string;
};

export async function verifyTurnstile(token: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY; 
  if (!secret) {
    return { ok: false, codes: ["missing-input-secret"] as string[] };
  }

  const body = new URLSearchParams({
    secret,
    response: token,
  });

  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  );

  const data = (await res.json()) as TurnstileVerifyResult;

  return {
    ok: Boolean(data.success),
    codes: data["error-codes"] ?? [],
    hostname: data.hostname,
  };
}
