/**
 * File: lib/client/session.ts
 * Purpose: Browser-side game session: creates one server session per page load, retries once if the
 *          server forgot it (restart/sweep), and ends it when the tab closes so Solari is cleaned up.
 *          The client only ever sends the session id; it never talks to Solari or Groq.
 * Author: manasa
 * Date: 2026-11-21
 */
import { SessionId } from "../schemas";

const JSON_HEADERS = { "Content-Type": "application/json" } as const;
const SESSION_ERROR = "Wonderland couldn't start a session. Please reload the page.";
const HTTP_NOT_FOUND = 404;

let sessionPromise: Promise<string> | null = null;
let currentId: string | null = null;

async function createSession(): Promise<string> {
  const response = await fetch("/api/session", { method: "POST" });
  if (!response.ok) throw new Error(SESSION_ERROR);
  const parsed = SessionId.safeParse(((await response.json()) as { sessionId?: unknown }).sessionId);
  if (!parsed.success) throw new Error(SESSION_ERROR);
  currentId = parsed.data;
  return parsed.data;
}

export function ensureSession(): Promise<string> {
  sessionPromise ??= createSession().catch((error: unknown) => {
    sessionPromise = null;
    throw error;
  });
  return sessionPromise;
}

function resetSession(): void {
  sessionPromise = null;
  currentId = null;
}

/** POSTs JSON with the session id added. One retry with a fresh session if the server says 404. */
export async function postWithSession(path: string, extra: object = {}, signal?: AbortSignal): Promise<Response> {
  let response = await send(path, extra, signal);
  if (response.status === HTTP_NOT_FOUND) {
    resetSession();
    response = await send(path, extra, signal);
  }
  return response;
}

async function send(path: string, extra: object, signal?: AbortSignal): Promise<Response> {
  const sessionId = await ensureSession();
  return fetch(path, { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ sessionId, ...extra }), signal });
}

/** Ends the server session on tab close (keepalive lets the request outlive the page). */
export function endSessionOnLeave(): void {
  if (!currentId) return;
  void fetch("/api/session", {
    method: "DELETE",
    headers: JSON_HEADERS,
    body: JSON.stringify({ sessionId: currentId }),
    keepalive: true,
  }).catch(() => undefined);
}
