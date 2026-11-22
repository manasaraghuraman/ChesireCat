/**
 * File: app/api/trial/evidence/route.ts
 * Purpose: POST {sessionId} → screenshot of the faked court-evidence page (via Solari) plus the vision
 *          model's list of flaws. Falls back to the planted flaws if the model is unavailable.
 * Author: manasa
 * Date: 2026-11-21 (updated: in-browser fallback page)
 */
import { jsonError, parseBody, TOO_MANY_REQUESTS } from "@/lib/api";
import { analyzeEvidence } from "@/lib/agents/evidence";
import { RABBIT_RATE_LIMIT_PER_MINUTE } from "@/lib/constants";
import { logEvent, newRequestId } from "@/lib/log";
import { clientKey, createRateLimiter } from "@/lib/rate-limit";
import { SessionBody } from "@/lib/schemas";
import { ensureRuntime, getSession } from "@/lib/session/registry";
import { capturePage } from "@/lib/solari/browser";
import { pageUrl, wonderFallback } from "@/lib/wonderweb";

const allow = createRateLimiter(RABBIT_RATE_LIMIT_PER_MINUTE);

export async function POST(request: Request): Promise<Response> {
  if (!allow(clientKey(request))) return jsonError(TOO_MANY_REQUESTS, 429);
  const body = await parseBody(request, SessionBody);
  if (!body.isOk) return body.response;
  const session = getSession(body.value.sessionId);
  if (!session) return jsonError("Unknown session.", 404);
  const runtime = await ensureRuntime(session);
  if (!runtime.isOk) return jsonError("The court is closed right now.", 503);

  const requestId = newRequestId();
  const captured = await capturePage(pageUrl(runtime.value.baseUrl, "court-evidence"), wonderFallback("court-evidence"));
  if (!captured.isOk) {
    logEvent({ level: "ERROR", operation: "trial.evidence", outcome: captured.error.code, requestId });
    return jsonError("The evidence couldn't be fetched. Try again.", 502);
  }
  const analysis = await analyzeEvidence(captured.value, request.signal);
  logEvent({ level: "INFO", operation: "trial.evidence", outcome: "analysed", requestId });
  return Response.json({ screenshotPngBase64: captured.value.screenshotPngBase64, ...analysis });
}
