/**
 * File: lib/rate-limit.ts
 * Purpose: Small in-memory fixed-window rate limiter for API routes (spec §12).
 *          Per server instance only; fine for the demo, swap for a shared store later.
 * Author: varenya
 * Date: 2026-11-21
 */

const WINDOW_MS = 60_000;
const MAX_TRACKED_KEYS = 10_000;

interface Window {
  start: number;
  count: number;
}

export function createRateLimiter(limitPerMinute: number, now: () => number = Date.now) {
  const windows = new Map<string, Window>();

  return function allow(key: string): boolean {
    const time = now();
    const current = windows.get(key);
    if (!current || time - current.start >= WINDOW_MS) {
      if (windows.size >= MAX_TRACKED_KEYS) windows.clear();
      windows.set(key, { start: time, count: 1 });
      return true;
    }
    if (current.count >= limitPerMinute) return false;
    current.count += 1;
    return true;
  };
}

/** Best-effort client key: first forwarded IP, else a shared bucket. */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "local";
}
