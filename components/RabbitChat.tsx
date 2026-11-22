/**
 * File: components/RabbitChat.tsx
 * Purpose: Chat panel for talking to the White Rabbit in the Hall: ask him anything about carbon
 *          footprints and he answers in character (AI, with a scripted fallback). Opens when the world
 *          starts the "rabbit" dialogue (E on him); Esc closes it. The conversation lives only in memory.
 * Author: manasa
 * Date: 2026-11-22
 */
"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { emit, on } from "@/game/bridge";
import { rabbitGuidance } from "@/lib/carbonContent";
import { CHAT_HISTORY_MAX, CHAT_MESSAGE_MAX } from "@/lib/agents/rabbitChat";
import { useGameStore } from "@/lib/state/store";

interface Turn {
  readonly role: "player" | "rabbit";
  readonly text: string;
}

const GREETING_TAIL = " Ask me anything about carbon footprints!";
const NETWORK_ERROR = "The Rabbit tripped over his pocket watch. Check your connection and try again.";
const REPLY_FALLBACK = "Hmm, I lost my train of thought! Ask me again?";

function readReply(data: unknown): string {
  const reply = (data as { reply?: unknown } | null)?.reply;
  return typeof reply === "string" && reply.trim() ? reply : REPLY_FALLBACK;
}

export default function RabbitChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLOListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const offs = [
      on("dialogue-open", ({ levelId }) => {
        if (levelId !== "rabbit") return;
        setIsOpen(true);
        setTurns((current) =>
          current.length > 0 ? current : [{ role: "rabbit", text: rabbitGuidance(useGameStore.getState().keys) + GREETING_TAIL }],
        );
      }),
      on("dialogue-close", () => {
        abortRef.current?.abort();
        setIsOpen(false);
        setIsBusy(false);
      }),
    ];
    return () => {
      offs.forEach((off) => off());
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    inputRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") emit("dialogue-close", null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [turns]);

  async function ask(event: FormEvent): Promise<void> {
    event.preventDefault();
    const message = draft.trim();
    if (!message || isBusy) return;
    const history = turns.slice(-CHAT_HISTORY_MAX);
    setTurns([...turns, { role: "player", text: message }]);
    setDraft("");
    setError(null);
    setIsBusy(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const response = await fetch("/api/rabbit/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history, keys: useGameStore.getState().keys }),
        signal: controller.signal,
      });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error((data as { error?: string } | null)?.error ?? NETWORK_ERROR);
      setTurns((current) => [...current, { role: "rabbit", text: readReply(data) }]);
    } catch (caught) {
      if (controller.signal.aborted) return;
      setTurns((current) => current.slice(0, -1)); // give the question back
      setDraft(message);
      setError(caught instanceof Error ? caught.message : NETWORK_ERROR);
    } finally {
      setIsBusy(false);
    }
  }

  if (!isOpen) return null;
  return (
    <section
      aria-label="Conversation with the White Rabbit"
      className="fixed bottom-4 left-1/2 z-30 flex w-[min(40rem,calc(100vw-2rem))] -translate-x-1/2 flex-col gap-3 rounded-lg bg-black/85 p-4 font-sans text-amber-50 shadow-xl"
    >
      <h2 className="text-sm font-bold uppercase tracking-wide text-amber-300">🐇 The White Rabbit</h2>
      <ol ref={logRef} role="log" aria-live="polite" aria-busy={isBusy} className="flex max-h-60 flex-col gap-2 overflow-y-auto">
        {turns.map((turn, index) => (
          <li
            key={index}
            className={turn.role === "rabbit" ? "self-start rounded bg-purple-900/80 px-3 py-2" : "self-end rounded bg-amber-200 px-3 py-2 text-purple-950"}
          >
            <span className="sr-only">{turn.role === "rabbit" ? "White Rabbit: " : "You: "}</span>
            {turn.text}
          </li>
        ))}
        {isBusy && (
          <li className="self-start rounded bg-purple-900/80 px-3 py-2" aria-label="The Rabbit is thinking">
            …
          </li>
        )}
      </ol>
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
      <form onSubmit={ask} className="flex gap-2">
        <label htmlFor="rabbit-question" className="sr-only">
          Your question for the Rabbit
        </label>
        <input
          id="rabbit-question"
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={CHAT_MESSAGE_MAX}
          autoComplete="off"
          placeholder="Why does driving make CO2?"
          className="flex-1 rounded bg-white/90 px-3 py-2 text-purple-950"
        />
        <button type="submit" disabled={isBusy || !draft.trim()} className="rounded bg-amber-400 px-4 py-2 font-bold text-purple-950 disabled:opacity-50">
          Ask
        </button>
      </form>
      <button type="button" onClick={() => emit("dialogue-close", null)} className="self-start rounded bg-white/10 px-3 py-1 text-sm hover:bg-white/20">
        Back <span className="text-amber-100/60">(Esc)</span>
      </button>
    </section>
  );
}
