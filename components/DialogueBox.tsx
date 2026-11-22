/**
 * File: components/DialogueBox.tsx
 * Purpose: NPC conversation UI: streamed replies, player input, and Referee feedback. The
 *          transcript lives only in component state (never saved). Supports rewinding the last exchange.
 * Author: varenya
 * Date: 2026-11-21 (updated: all characters, rewind support, streaming moved to lib/client)
 */
"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { NPC_MAX_TEXT } from "@/lib/constants";
import { streamDialogue } from "@/lib/client/dialogue";
import type { DialogueTurnType, RefereeVerdictType } from "@/lib/schemas";

interface Props {
  readonly levelId: string;
  readonly npcName: string;
  readonly openingLine: string;
  readonly onVerdict: (verdict: RefereeVerdictType) => void;
  /** Called just before a player turn is sent: the checkpoint a rewind returns to. */
  readonly onBeforeSend: () => void;
  /** Increment to drop the last exchange (the player and NPC lines of the rewound turn). */
  readonly rewindToken: number;
}

/** Appends streamed text to the NPC reply bubble at the end of the transcript. */
function appendToLastReply(turns: DialogueTurnType[], delta: string): DialogueTurnType[] {
  const last = turns.at(-1);
  if (!last || last.role !== "npc") return turns;
  return [...turns.slice(0, -1), { role: "npc", text: last.text + delta }];
}

export default function DialogueBox({ levelId, npcName, openingLine, onVerdict, onBeforeSend, rewindToken }: Props) {
  const [turns, setTurns] = useState<DialogueTurnType[]>([{ role: "npc", text: openingLine }]);
  const [draft, setDraft] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isJudging, setIsJudging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLOListElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const seenRewindToken = useRef(rewindToken);
  const failureMessage = `The ${npcName} wandered off. Check your connection and try again.`;

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [turns]);
  useEffect(() => {
    if (rewindToken === seenRewindToken.current) return;
    seenRewindToken.current = rewindToken;
    abortRef.current?.abort();
    setTurns((current) => (current.length > 2 ? current.slice(0, -2) : current));
    setError(null);
  }, [rewindToken]);

  async function send(event: FormEvent): Promise<void> {
    event.preventDefault();
    const text = draft.trim();
    if (!text || isBusy) return;

    onBeforeSend();
    const history: DialogueTurnType[] = [...turns, { role: "player", text }];
    setTurns([...history, { role: "npc", text: "" }]);
    setDraft("");
    setError(null);
    setIsBusy(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamDialogue(
        levelId,
        history,
        {
          onLine: (delta) => setTurns((current) => appendToLastReply(current, delta)),
          onLineEnd: () => setIsJudging(true),
          onVerdict,
        },
        controller.signal,
        failureMessage,
      );
    } catch (caught) {
      if (controller.signal.aborted) return;
      // Drop the empty reply bubble and give the player their words back.
      setTurns((current) => (current.at(-1)?.text === "" ? current.slice(0, -2) : current));
      setDraft(text);
      setError(caught instanceof Error ? caught.message : failureMessage);
    } finally {
      setIsBusy(false);
      setIsJudging(false);
    }
  }

  return (
    <section aria-label={`Conversation with the ${npcName}`} className="flex flex-col gap-3 rounded bg-black/50 p-4">
      <ol
        ref={logRef}
        role="log"
        aria-live="polite"
        aria-busy={isBusy}
        className="flex max-h-64 flex-col gap-2 overflow-y-auto"
      >
        {turns.map((turn, index) => (
          <li
            key={index}
            className={
              turn.role === "npc"
                ? "self-start rounded bg-purple-900/80 px-3 py-2"
                : "self-end rounded bg-amber-200 px-3 py-2 text-purple-950"
            }
          >
            <span className="sr-only">{turn.role === "npc" ? `${npcName}: ` : "You: "}</span>
            {turn.text || <span aria-label={`${npcName} is typing`}>…</span>}
          </li>
        ))}
      </ol>

      {isJudging && (
        <p className="text-sm italic text-amber-200" role="status">
          The Referee is weighing your answer…
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}

      <form onSubmit={send} className="flex gap-2">
        <label htmlFor="player-reply" className="sr-only">
          Your reply
        </label>
        <input
          id="player-reply"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={NPC_MAX_TEXT}
          autoComplete="off"
          placeholder="What do you say?"
          className="flex-1 rounded bg-white/90 px-3 py-2 text-purple-950"
        />
        <button
          type="submit"
          disabled={isBusy || !draft.trim()}
          className="rounded bg-amber-400 px-4 py-2 font-bold text-purple-950 disabled:opacity-50"
        >
          Say
        </button>
      </form>
    </section>
  );
}
