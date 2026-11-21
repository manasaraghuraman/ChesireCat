/**
 * File: app/api/npc/[id]/route.ts
 * Purpose: POST player turn → SSE stream of the NPC's reply, then the Referee's
 *          verdict. The two model calls run in parallel (Groq can't stream and
 *          return strict JSON in one call). Player text is never logged or stored.
 * Author: varenya
 * Date: 2026-11-21
 */
import { NPC_CONTEXT_TURNS, NPC_RATE_LIMIT_PER_MINUTE } from "@/lib/constants";
import { streamNpcLine } from "@/lib/agents/npc";
import { getNpcLevel } from "@/lib/agents/personas";
import { judgeTurn } from "@/lib/agents/referee";
import { clientKey, createRateLimiter } from "@/lib/rate-limit";
import { NpcRequest } from "@/lib/schemas";
import { sseResponse, type SseEvent } from "@/lib/sse";

const allow = createRateLimiter(NPC_RATE_LIMIT_PER_MINUTE);

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  const level = getNpcLevel(id);
  if (!level) return Response.json({ error: "Unknown character." }, { status: 404 });

  if (!allow(clientKey(request))) {
    return Response.json({ error: "Too many messages. Take a breath and try again in a minute." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = NpcRequest.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });

  const { persona, rubric } = level;
  const turns = parsed.data.turns.slice(-NPC_CONTEXT_TURNS);
  const signal = request.signal;

  async function* events(): AsyncGenerator<SseEvent> {
    // Start the Referee now so it runs while the NPC line streams.
    const verdict = judgeTurn({ persona, rubric, turns, abortSignal: signal });
    verdict.catch(() => undefined); // handled when awaited below

    for await (const delta of streamNpcLine({ persona, turns, abortSignal: signal })) {
      yield { event: "line", data: delta };
    }
    yield { event: "line-end", data: null };

    const { value } = await verdict;
    yield { event: "verdict", data: value };
  }

  return sseResponse(events(), () => console.error(`[npc:${id}] route failed`));
}
