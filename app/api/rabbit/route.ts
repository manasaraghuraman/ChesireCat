/**
 * File: app/api/rabbit/route.ts
 * Purpose: POST {sessionId, page} → SSE of the White Rabbit browsing a WonderWeb page in Solari:
 *          screenshot, streamed narration, verdict, replay. The server picks the URL from the
 *          session's sandbox and decides the defenses flag from server-side state.
 * Author: manasa
 * Date: 2026-11-21 (updated: in-browser fallback page)
 */
import { jsonError, parseBody, TOO_MANY_REQUESTS } from "@/lib/api";
import { visitPage } from "@/lib/agents/rabbit.visit";
import { RABBIT_RATE_LIMIT_PER_MINUTE } from "@/lib/constants";
import { logEvent, newRequestId } from "@/lib/log";
import { clientKey, createRateLimiter } from "@/lib/rate-limit";
import { RabbitBody } from "@/lib/schemas";
import { ensureRuntime, getSession } from "@/lib/session/registry";
import { sseResponse, type SseEvent } from "@/lib/sse";
import { pageUrl, wonderFallback } from "@/lib/wonderweb";

const allow = createRateLimiter(RABBIT_RATE_LIMIT_PER_MINUTE);

export async function POST(request: Request): Promise<Response> {
  if (!allow(clientKey(request))) return jsonError(TOO_MANY_REQUESTS, 429);
  const body = await parseBody(request, RabbitBody);
  if (!body.isOk) return body.response;
  const session = getSession(body.value.sessionId);
  if (!session) return jsonError("Unknown session.", 404);
  const runtime = await ensureRuntime(session);
  if (!runtime.isOk) return jsonError("The Rabbit can't find Wonderland right now.", 503);

  const requestId = newRequestId();
  const defenses = session.isRabbitCured ? "on" : "off";
  const { page } = body.value;
  const url = pageUrl(runtime.value.baseUrl, page);
  async function* events(): AsyncGenerator<SseEvent> {
    for await (const event of visitPage({ url, defenses, fallback: wonderFallback(page), abortSignal: request.signal })) {
      yield { event: event.type, data: event };
    }
    logEvent({ level: "INFO", operation: "rabbit.visit", outcome: `done (defenses ${defenses})`, requestId });
  }
  return sseResponse(events(), () =>
    logEvent({ level: "ERROR", operation: "rabbit.visit", outcome: "stream failed", requestId }),
  );
}
