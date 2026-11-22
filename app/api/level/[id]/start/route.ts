/**
 * File: app/api/level/[id]/start/route.ts
 * Purpose: POST boots the session's WonderWeb sandbox (once), serves the fake pages and takes the
 *          level-start snapshot. Returns only readiness: preview URLs never reach the client.
 * Author: manasa
 * Date: 2026-11-21
 */
import { jsonError, parseBody } from "@/lib/api";
import { logEvent, newRequestId } from "@/lib/log";
import { LevelId, LevelStartBody } from "@/lib/schemas";
import { ensureRuntime, getSession } from "@/lib/session/registry";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  if (!LevelId.safeParse((await context.params).id).success) return jsonError("Unknown level.", 404);
  const body = await parseBody(request, LevelStartBody);
  if (!body.isOk) return body.response;
  const session = getSession(body.value.sessionId);
  if (!session) return jsonError("Unknown session.", 404);

  session.isRabbitCured = session.isRabbitCured || body.value.isRabbitCured;
  const requestId = newRequestId();
  const runtime = await ensureRuntime(session);
  if (!runtime.isOk) {
    logEvent({ level: "ERROR", operation: "level.start", outcome: runtime.error.code, requestId });
    return jsonError("The level could not start. Try again in a moment.", 503);
  }
  logEvent({ level: "INFO", operation: "level.start", outcome: "ready", requestId });
  return Response.json({ isReady: true, canRewind: runtime.value.snapshotId !== null });
}
