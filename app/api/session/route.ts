/**
 * File: app/api/session/route.ts
 * Purpose: POST creates a game session; DELETE ends it and cleans up its Solari sandbox.
 *          The session id is an unguessable capability; nothing else about the player is stored.
 * Author: manasa
 * Date: 2026-11-21
 */
import { jsonError, parseBody, TOO_MANY_REQUESTS } from "@/lib/api";
import { SESSION_RATE_LIMIT_PER_MINUTE } from "@/lib/constants";
import { logEvent, newRequestId } from "@/lib/log";
import { clientKey, createRateLimiter } from "@/lib/rate-limit";
import { SessionBody } from "@/lib/schemas";
import { createSession, endSession } from "@/lib/session/registry";

const allow = createRateLimiter(SESSION_RATE_LIMIT_PER_MINUTE);

export async function POST(request: Request): Promise<Response> {
  if (!allow(clientKey(request))) return jsonError(TOO_MANY_REQUESTS, 429);
  const sessionId = await createSession();
  logEvent({ level: "INFO", operation: "session.create", outcome: "created", requestId: newRequestId() });
  return Response.json({ sessionId });
}

export async function DELETE(request: Request): Promise<Response> {
  const body = await parseBody(request, SessionBody);
  if (!body.isOk) return body.response;
  const wasEnded = await endSession(body.value.sessionId);
  return Response.json({ ended: wasEnded });
}
