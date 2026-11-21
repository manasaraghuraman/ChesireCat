/**
 * File: lib/agents/npc.ts
 * Purpose: Streams an NPC's in-character reply, swapping out-of-character
 *          refusals or failures for a fallback line.
 * Author: varenya
 * Date: 2026-11-21
 */
import type { ModelMessage } from "ai";
import { NPC_CONTEXT_TURNS } from "../constants";
import { streamLine } from "../llm";
import type { DialogueTurnType } from "../schemas";
import { buildSystemPrompt, type Persona } from "./personas/shared";

const NPC_TEMPERATURE = 0.9;
/** Characters held back before streaming, so a refusal can be caught first. */
export const REFUSAL_PEEK_CHARS = 60;

const REFUSAL_PATTERN =
  /^\W*(i['’]?m sorry|i am sorry|sorry,? but|i can(?:no|['’])t (?:help|assist|comply|do that)|i (?:won['’]t|will not) (?:help|assist)|as an ai)/i;

export function isRefusal(text: string): boolean {
  return REFUSAL_PATTERN.test(text.trim());
}

export function pickFallback(persona: Persona, random: () => number = Math.random): string {
  const lines = persona.fallbackLines;
  return lines[Math.floor(random() * lines.length)] ?? lines[0] ?? "…";
}

/** Recent turns as chat messages: player → user, NPC → assistant. */
export function toModelMessages(turns: readonly DialogueTurnType[]): ModelMessage[] {
  return turns.slice(-NPC_CONTEXT_TURNS).map((turn) =>
    turn.role === "player"
      ? { role: "user" as const, content: turn.text }
      : { role: "assistant" as const, content: turn.text },
  );
}

/**
 * Buffers the first REFUSAL_PEEK_CHARS characters. If they look like a refusal,
 * or the source yields nothing or fails before anything is sent, yields the
 * fallback instead. After the peek, deltas pass straight through.
 */
export async function* guardRefusal(
  source: AsyncIterable<string>,
  fallback: () => string,
): AsyncGenerator<string> {
  let buffer = "";
  let isStreaming = false;
  try {
    for await (const delta of source) {
      if (isStreaming) {
        yield delta;
        continue;
      }
      buffer += delta;
      if (buffer.length < REFUSAL_PEEK_CHARS) continue;
      if (isRefusal(buffer)) {
        yield fallback();
        return;
      }
      isStreaming = true;
      yield buffer;
    }
  } catch (error) {
    if (isStreaming) throw error;
    yield fallback();
    return;
  }
  if (isStreaming) return;
  yield buffer.trim() && !isRefusal(buffer) ? buffer : fallback();
}

export function streamNpcLine(options: {
  readonly persona: Persona;
  readonly turns: readonly DialogueTurnType[];
  readonly abortSignal?: AbortSignal;
}): AsyncGenerator<string> {
  const source = streamLine({
    system: buildSystemPrompt(options.persona),
    messages: toModelMessages(options.turns),
    temperature: NPC_TEMPERATURE,
    reasoningEffort: "low",
    abortSignal: options.abortSignal,
    onError: () => console.warn(`[npc:${options.persona.id}] stream failed`),
  });
  return guardRefusal(source, () => pickFallback(options.persona));
}
