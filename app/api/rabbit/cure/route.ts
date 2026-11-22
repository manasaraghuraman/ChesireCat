/**
 * File: app/api/rabbit/cure/route.ts
 * Purpose: POST {sessionId, message} → judges whether the player warned the Rabbit about the hidden
 *          injection. On success the session's Rabbit switches to defenses "on". Message is never stored.
 * Author: manasa
 * Date: 2026-11-21
 */
import { jsonError, parseBody, TOO_MANY_REQUESTS } from "@/lib/api";
import { judgeCure } from "@/lib/agents/rabbit";
import { RABBIT_RATE_LIMIT_PER_MINUTE } from "@/lib/constants";
import { logEvent, newRequestId } from "@/lib/log";
import { clientKey, createRateLimiter } from "@/lib/rate-limit";
import { CureBody } from "@/lib/schemas";
import { getSession } from "@/lib/session/registry";

const allow = createRateLimiter(RABBIT_RATE_LIMIT_PER_MINUTE);

export async function POST(request: Request): Promise<Response> {
  if (!allow(clientKey(request))) return jsonError(TOO_MANY_REQUESTS, 429);
  const body = await parseBody(request, CureBody);
  if (!body.isOk) return body.response;
  const session = getSession(body.value.sessionId);
  if (!session) return jsonError("Unknown session.", 404);

  const { value } = await judgeCure(body.value.message, request.signal);
  if (value.isCured) session.isRabbitCured = true;
  logEvent({ level: "INFO", operation: "rabbit.cure", outcome: value.isCured ? "cured" : "not cured", requestId: newRequestId() });
  return Response.json(value);
}
