import "server-only";

/**
 * Simple fixed-window rate limiter kept in process memory.
 *
 * Good enough for a single-instance MVP. When the app runs on multiple
 * instances or serverless functions, replace this with a shared store
 * (e.g. Redis) so limits apply across all instances.
 */
const windows = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): { ok: boolean; retryAfterSeconds: number } {
  const entry = windows.get(key);
  if (!entry || entry.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    if (windows.size > 10_000) {
      for (const [k, v] of windows) if (v.resetAt <= now) windows.delete(k);
    }
    return { ok: true, retryAfterSeconds: 0 };
  }
  if (entry.count >= limit) return { ok: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
  entry.count += 1;
  return { ok: true, retryAfterSeconds: 0 };
}

export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "anonymous";
}
