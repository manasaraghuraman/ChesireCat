/**
 * File: app/api/rabbit/route.ts
 * Purpose: POST {defenses: "on" | "off"} → SSE stream of the White Rabbit browsing the Cat's page
 *          in Solari: narration deltas, the screenshot, the verdict and the replay link
 *          (Appendix A §6, §7.2). Keys stay server-side; nothing the player types reaches here.
 * Date: 2026-11-21
 */
import { z } from "zod";
import { runRabbit } from "@/lib/agents/rabbit";
import { clientKey, createRateLimiter } from "@/lib/rate-limit";
import { sseResponse, type SseEvent } from "@/lib/sse";

/** Each run boots a sandbox and a browser, so keep this low. */
const RABBIT_RATE_LIMIT_PER_MINUTE = 6;
const allow = createRateLimiter(RABBIT_RATE_LIMIT_PER_MINUTE);
const RabbitRequest = z.object({ defenses: z.enum(["on", "off"]) });

export async function POST(request: Request): Promise<Response> {
  if (!allow(clientKey(request))) {
    return Response.json({ error: "The Rabbit is out of breath. Try again in a minute." }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = RabbitRequest.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });

  const { defenses } = parsed.data;
  const signal = request.signal;
  async function* events(): AsyncGenerator<SseEvent> {
    for await (const event of runRabbit(defenses, signal)) {
      yield { event: event.type, data: event };
    }
  }
  return sseResponse(events(), () => console.error("[rabbit] route failed"));
}
