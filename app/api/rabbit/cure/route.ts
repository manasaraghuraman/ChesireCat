/**
 * File: app/api/rabbit/cure/route.ts
 * Purpose: POST {text} → {cured, reply}: did Alice point out that the White Rabbit was tricked?
 *          Player text is judged, never logged or stored.
 * Date: 2026-11-21
 */
import { z } from "zod";
import { judgeCure } from "@/lib/agents/rabbit";
import { NPC_MAX_TEXT, NPC_RATE_LIMIT_PER_MINUTE } from "@/lib/constants";
import { clientKey, createRateLimiter } from "@/lib/rate-limit";

const allow = createRateLimiter(NPC_RATE_LIMIT_PER_MINUTE);
const CureRequest = z.object({ text: z.string().trim().min(1).max(NPC_MAX_TEXT) });

export async function POST(request: Request): Promise<Response> {
  if (!allow(clientKey(request))) {
    return Response.json({ error: "Too many messages. Take a breath and try again in a minute." }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = CureRequest.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });
  return Response.json(await judgeCure(parsed.data.text, request.signal));
}
