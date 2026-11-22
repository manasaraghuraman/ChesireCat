/**
 * File: components/LookingGlass.tsx
 * Purpose: Looking-Glass mode (spec §3.7), unlocked after the garden. Phase B: the player writes a
 *          scam message and the Rabbit (defenses on) tries to catch it. Nothing typed is stored.
 * Author: manasa
 * Date: 2026-11-21
 */
"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { SCAM_TEXT_MAX_LENGTH } from "@/lib/constants";
import { detectScamRequest } from "@/lib/client/requests";
import type { ScamDetectionType } from "@/lib/schemas";

export default function LookingGlass() {
  const [message, setMessage] = useState("");
  const [isJudging, setIsJudging] = useState(false);
  const [result, setResult] = useState<ScamDetectionType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!message.trim() || isJudging) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setIsJudging(true);
    setError(null);
    setResult(null);
    try {
      setResult(await detectScamRequest(message.trim(), controller.signal));
    } catch (caught) {
      if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setIsJudging(false);
    }
  }

  return (
    <section aria-label="Looking-Glass mode" className="flex flex-col gap-3 rounded bg-black/50 p-4">
      <h2 className="text-lg font-bold">Through the Looking-Glass</h2>
      <p className="text-sm">
        Now YOU are the trickster. Write a pretend scam message (no real names or links, please) and see whether the
        Rabbit, with its defenses up, catches it.
      </p>
      <form onSubmit={submit} className="flex flex-col gap-2">
        <label htmlFor="scam-message" className="sr-only">
          Your pretend scam message
        </label>
        <textarea
          id="scam-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={SCAM_TEXT_MAX_LENGTH}
          rows={4}
          className="rounded bg-white/90 px-3 py-2 text-purple-950"
        />
        <button type="submit" disabled={isJudging || !message.trim()} className="self-start rounded bg-amber-400 px-4 py-2 font-bold text-purple-950 disabled:opacity-50">
          {isJudging ? "The Rabbit is reading…" : "Try to trick the Rabbit"}
        </button>
      </form>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      {result && (
        <div role="status" className="text-sm">
          <p className="text-lg font-bold">{result.isCaught ? "The Rabbit caught it!" : "You fooled the Rabbit!"}</p>
          <p>{result.explanation}</p>
          <p>Red flags named: {result.redFlagsNamed.join(" · ")}</p>
        </div>
      )}
    </section>
  );
}
