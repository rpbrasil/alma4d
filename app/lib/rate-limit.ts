type Entry = {
  count: number;
  reset: number;
};

const store = new Map<string, Entry>();

export function rateLimit(ip: string, limit = 5, windowMs = 60_000) {
  const now = Date.now();

  const entry = store.get(ip);

  if (!entry || now > entry.reset) {
    store.set(ip, {
      count: 1,
      reset: now + windowMs,
    });
    return { success: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0 };
  }

  entry.count++;
  return { success: true, remaining: limit - entry.count };
}
