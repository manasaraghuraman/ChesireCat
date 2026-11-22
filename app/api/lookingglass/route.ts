/**
 * File: app/api/lookingglass/route.ts
 * Purpose: POST {message} → the Rabbit (defenses on) judges a scam message the player wrote
 *          (Looking-Glass phase B). Rate-limited; the message is never logged or stored.
 * Author: manasa
 * Date: 2026-11-21
 */
import { jsonError, parseBody, TOO_MANY_REQUESTS } from "@/lib/api";
import { detectScam } from "@/lib/agents/lookingglass";
import { LOOKING_GLASS_RATE_LIMIT_PER_MINUTE } from "@/lib/constants";
import { logEvent, newRequestId } from "@/lib/log";
import { clientKey, createRateLimiter } from "@/lib/rate-limit";
import { ScamBody } from "@/lib/schemas";

const allow = createRateLimiter(LOOKING_GLASS_RATE_LIMIT_PER_MINUTE);

export async function POST(request: Request): Promise<Response> {
  if (!allow(clientKey(request))) return jsonError(TOO_MANY_REQUESTS, 429);
  const body = await parseBody(request, ScamBody);
  if (!body.isOk) return body.response;
  const { value } = await detectScam(body.value.message, request.signal);
  logEvent({ level: "INFO", operation: "lookingglass.detect", outcome: value.isCaught ? "caught" : "missed", requestId: newRequestId() });
  return Response.json(value);
}
