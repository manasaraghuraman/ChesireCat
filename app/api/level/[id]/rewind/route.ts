/**
 * File: app/api/level/[id]/rewind/route.ts
 * Purpose: POST reverts the session sandbox to its level-start snapshot (spec §3.3). The game
 *          also restores its own state JSON client-side, so a failed revert is reported, not fatal.
 * Author: manasa
 * Date: 2026-11-21
 */
import { jsonError, parseBody } from "@/lib/api";
import { logEvent, newRequestId } from "@/lib/log";
import { LevelId, SessionBody } from "@/lib/schemas";
import { getSession, rewindRuntime } from "@/lib/session/registry";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  if (!LevelId.safeParse((await context.params).id).success) return jsonError("Unknown level.", 404);
  const body = await parseBody(request, SessionBody);
  if (!body.isOk) return body.response;
  const session = getSession(body.value.sessionId);
  if (!session) return jsonError("Unknown session.", 404);

  const result = await rewindRuntime(session);
  logEvent({
    level: result.isOk ? "INFO" : "WARN",
    operation: "level.rewind",
    outcome: result.isOk ? "reverted" : result.error.code,
    requestId: newRequestId(),
  });
  return Response.json({ isSandboxRewound: result.isOk });
}
