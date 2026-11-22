/**
 * File: app/api/rabbit/chat/route.ts
 * Purpose: POST {message, history, keys} → the White Rabbit's reply about carbon footprints. Input is
 *          validated with zod, rate-limited per client, and answered by the text model with a scripted
 *          fallback. The player's text is never logged or stored.
 * Author: manasa
 * Date: 2026-11-22
 */
import {
  chatWithRabbit,
  RABBIT_CHAT_RATE_LIMIT_PER_MINUTE,
  RabbitChatBody,
} from "@/lib/agents/rabbitChat";
import { clientKey, createRateLimiter } from "@/lib/rate-limit";

const allow = createRateLimiter(RABBIT_CHAT_RATE_LIMIT_PER_MINUTE);
const json = (body: unknown, status: number) => Response.json(body, { status });

export async function POST(request: Request): Promise<Response> {
  if (!allow(clientKey(request))) {
    return json({ error: "Too many questions. Let the Rabbit catch his breath for a minute." }, 429);
  }
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ error: "Invalid JSON." }, 400);
  }
  const parsed = RabbitChatBody.safeParse(raw);
  if (!parsed.success) return json({ error: "Invalid request." }, 400);
  try {
    return json(await chatWithRabbit(parsed.data, request.signal), 200);
  } catch {
    console.error("[rabbit-chat] route failed");
    return json({ error: "The Rabbit tripped over his pocket watch. Try again." }, 500);
  }
}
