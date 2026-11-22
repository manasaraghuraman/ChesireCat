/**
 * File: lib/solari/ready.ts
 * Purpose: Waits until a freshly exposed sandbox preview actually serves pages. Solari can answer
 *          HTTP 425 "Too Early" for a moment after port preview is created, and a browser visiting
 *          then would capture an error page. The URL is validated first (OWASP A10) and never logged.
 * Author: manasa
 * Date: 2026-11-21
 */
import { validateTargetUrl } from "./url";

export const READY_MAX_ATTEMPTS = 20;
export const READY_DELAY_MS = 1000;
export const READY_REQUEST_TIMEOUT_MS = 4000;

export interface ReadyDeps {
  readonly fetchImpl: (url: string, init: { signal: AbortSignal }) => Promise<{ readonly ok: boolean }>;
  readonly sleep: (milliseconds: number) => Promise<void>;
}

const REAL_DEPS: ReadyDeps = {
  fetchImpl: (url, init) => fetch(url, init),
  sleep: (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
};

async function isServing(url: string, deps: ReadyDeps): Promise<boolean> {
  try {
    const response = await deps.fetchImpl(url, { signal: AbortSignal.timeout(READY_REQUEST_TIMEOUT_MS) });
    return response.ok;
  } catch {
    return false; // not routable yet: try again
  }
}

/** Polls the URL until it answers 2xx. Returns false if it never does, or if the URL is not allowed. */
export async function waitUntilServing(url: string, deps: ReadyDeps = REAL_DEPS): Promise<boolean> {
  if (!validateTargetUrl(url).isOk) return false;
  for (let attempt = 1; attempt <= READY_MAX_ATTEMPTS; attempt++) {
    if (await isServing(url, deps)) return true;
    if (attempt < READY_MAX_ATTEMPTS) await deps.sleep(READY_DELAY_MS);
  }
  return false;
}
