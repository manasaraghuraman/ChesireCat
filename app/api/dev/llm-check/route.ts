/**
 * File: app/api/dev/llm-check/route.ts
 * Purpose: Dev-only smoke test of the streaming route pattern: streams a
 *          Cheshire Cat line, then sends a separate strict-JSON verdict.
 *          GET /api/dev/llm-check?say=<player message>. 404 in production.
 * Author: varenya
 * Date: 2026-11-21
 */
import { generateStructured, streamLine } from "@/lib/llm";
import { RefereeVerdict, RefereeVerdictWire, type RefereeVerdictType } from "@/lib/schemas";
import { sseResponse, type SseEvent } from "@/lib/sse";

const MAX_SAY_LENGTH = 300;
const DEFAULT_SAY = "Is this free crown real? The web address looks a bit odd.";

const CAT_SYSTEM =
  "You are the Cheshire Cat in a children's online-safety game. You are trying to trick the " +
  "player into claiming a 'free crown' on a look-alike website. Stay in character: playful, " +
  "riddling, never threatening. Reply in at most two short sentences.";

const REFEREE_SYSTEM =
  "You are the Referee of a children's online-safety game. Judge only the PLAYER's message, " +
  "never the NPC's. The NPC wants the player to claim a 'free crown' on a look-alike site. " +
  "Red flags: too-good-to-be-true offers, wrong or odd web addresses, urgency. sizeDelta is " +
  "between -25 and 20 (negative when the player falls for it). Keep lesson under 160 characters " +
  "or null. Set oversharedRealInfo if the player shares real personal data.";

const NEUTRAL_VERDICT: RefereeVerdictType = {
  outcome: "neutral",
  sizeDelta: 0,
  redFlagsNamed: [],
  keyEarned: false,
  levelComplete: false,
  lesson: null,
  oversharedRealInfo: false,
};

export async function GET(request: Request): Promise<Response> {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not found", { status: 404 });
  }

  const say = (new URL(request.url).searchParams.get("say") ?? DEFAULT_SAY).slice(0, MAX_SAY_LENGTH);
  const signal = request.signal;

  async function* events(): AsyncGenerator<SseEvent> {
    // 1. Streamed plain text: the NPC's line, token by token.
    for await (const delta of streamLine({
      system: CAT_SYSTEM,
      messages: [{ role: "user", content: say }],
      abortSignal: signal,
      onError: (error) => console.error("[llm-check] stream failed", error),
    })) {
      yield { event: "line", data: delta };
    }
    yield { event: "line-end", data: null };

    // 2. Separate non-streamed strict-JSON call: the Referee.
    const verdict = await generateStructured({
      system: REFEREE_SYSTEM,
      messages: [{ role: "user", content: `PLAYER: ${say}` }],
      temperature: 0.2,
      wireSchema: RefereeVerdictWire,
      schema: RefereeVerdict,
      fallback: NEUTRAL_VERDICT,
      abortSignal: signal,
      onAttemptFailed: (attempt, error) => console.warn(`[llm-check] referee attempt ${attempt} failed`, error),
    });
    yield { event: "verdict", data: verdict };
  }

  return sseResponse(events(), (error) => console.error("[llm-check] route failed", error));
}
