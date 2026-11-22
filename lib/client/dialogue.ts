/**
 * File: lib/client/dialogue.ts
 * Purpose: Streams one NPC exchange from /api/npc/[id]: reply lines, then the Referee verdict.
 *          Verdicts are validated with zod before they reach the game.
 * Author: manasa
 * Date: 2026-11-21
 */
import { NPC_MAX_TURNS } from "../constants";
import { RefereeVerdict, type DialogueTurnType, type RefereeVerdictType } from "../schemas";
import { readSse } from "../sse";

export interface DialogueHandlers {
  readonly onLine: (delta: string) => void;
  readonly onLineEnd: () => void;
  readonly onVerdict: (verdict: RefereeVerdictType) => void;
}

export async function streamDialogue(
  levelId: string,
  history: readonly DialogueTurnType[],
  handlers: DialogueHandlers,
  signal: AbortSignal,
  failureMessage: string,
): Promise<void> {
  const response = await fetch(`/api/npc/${levelId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ turns: history.slice(-NPC_MAX_TURNS) }),
    signal,
  });
  if (!response.ok || !response.body) {
    const message = await response.json().then((body: { error?: string }) => body.error).catch(() => undefined);
    throw new Error(message ?? failureMessage);
  }
  for await (const { event: name, data } of readSse(response.body)) {
    if (name === "line" && typeof data === "string") handlers.onLine(data);
    else if (name === "line-end") handlers.onLineEnd();
    else if (name === "verdict") {
      const verdict = RefereeVerdict.safeParse(data);
      if (verdict.success) handlers.onVerdict(verdict.data);
    } else if (name === "error") throw new Error(failureMessage);
  }
}
