/**
 * File: app/api/linkcheck/route.ts
 * Purpose: POST {url} → verdict JSON (screenshot, final URL, reasons). The URL is validated
 *          (http/https, no internal hosts) before Solari opens it; rate-limited per client.
 *          The URL is never logged.
 * Author: manasa
 * Date: 2026-11-21
 */
import { jsonError, parseBody, TOO_MANY_REQUESTS } from "@/lib/api";
import { checkLink } from "@/lib/agents/linkcheck";
import { LINKCHECK_RATE_LIMIT_PER_MINUTE } from "@/lib/constants";
import { logEvent, newRequestId } from "@/lib/log";
import { clientKey, createRateLimiter } from "@/lib/rate-limit";
import { LinkCheckBody } from "@/lib/schemas";

const allow = createRateLimiter(LINKCHECK_RATE_LIMIT_PER_MINUTE);

export async function POST(request: Request): Promise<Response> {
  if (!allow(clientKey(request))) return jsonError(TOO_MANY_REQUESTS, 429);
  const body = await parseBody(request, LinkCheckBody);
  if (!body.isOk) return body.response;

  const requestId = newRequestId();
  const result = await checkLink(body.value.url, request.signal);
  if (!result.isOk) {
    logEvent({ level: "WARN", operation: "linkcheck", outcome: result.error.code, requestId });
    const isBadUrl = result.error.code === "invalid-url";
    return jsonError(
      isBadUrl ? "That doesn't look like a web link I can open. Try one starting with https://" : "I couldn't open that page. It may be down or blocking visitors.",
      isBadUrl ? 400 : 502,
    );
  }
  logEvent({ level: "INFO", operation: "linkcheck", outcome: result.value.verdict, requestId });
  return Response.json(result.value);
}
