/**
 * File: components/RabbitPanel.tsx
 * Purpose: The Cheshire level's White Rabbit: browses the Cat's page in Solari with live narration,
 *          gets fooled by the hidden injection, and can be "cured" by the player (spec §2 twist).
 * Author: manasa
 * Date: 2026-11-21
 */
"use client";

import { useEffect, useReducer, useRef, useState, type FormEvent } from "react";
import { CURE_TEXT_MAX_LENGTH } from "@/lib/constants";
import { runRabbitVisit, sendCure } from "@/lib/client/requests";
import { INITIAL_RABBIT_VIEW, rabbitReducer } from "@/lib/client/rabbitState";
import BrowserView from "./BrowserView";
import RabbitBubble from "./RabbitBubble";

interface Props {
  readonly isCured: boolean;
  readonly onCured: () => void;
  readonly onReplay: (replayUrl: string) => void;
}

const INTRO = "Shall I pop over and look at the Cat's crown page for you? Do keep an eye on me, though!";
const ERROR_FALLBACK = "The Rabbit tripped over its pocket watch. Please try again.";

export default function RabbitPanel({ isCured, onCured, onReplay }: Props) {
  const [view, dispatch] = useReducer(rabbitReducer, INITIAL_RABBIT_VIEW);
  const [isBrowsing, setIsBrowsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cureDraft, setCureDraft] = useState("");
  const [cureReply, setCureReply] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function browse(): Promise<void> {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    dispatch({ type: "reset" });
    setError(null);
    setIsBrowsing(true);
    try {
      await runRabbitVisit(
        "free-crown",
        (event) => {
          dispatch(event);
          if (event.type === "replay") onReplay(event.replayUrl);
        },
        controller.signal,
      );
    } catch (caught) {
      if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : ERROR_FALLBACK);
    } finally {
      setIsBrowsing(false);
    }
  }

  async function warn(event: FormEvent): Promise<void> {
    event.preventDefault();
    const message = cureDraft.trim();
    if (!message) return;
    try {
      const judgement = await sendCure(message);
      setCureReply(judgement.rabbitReply);
      if (judgement.isCured) {
        onCured();
        setCureDraft("");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : ERROR_FALLBACK);
    }
  }

  const isFooled = view.verdict?.safe === true && !isCured;
  const verdictText = view.verdict
    ? `${view.verdict.safe ? "Looks safe!" : "Not safe!"} ${view.verdict.reasons.join(" ")}`
    : null;

  return (
    <section aria-label="The White Rabbit" className="flex flex-col gap-3 rounded bg-black/50 p-4">
      <RabbitBubble text={cureReply ?? (view.narration || (isBrowsing ? "" : INTRO))} isLive={isBrowsing} />
      {view.screenshot && (
        <BrowserView
          pngBase64={view.screenshot.pngBase64}
          address={view.screenshot.address}
          alt="Screenshot of the page the Rabbit is visiting"
        />
      )}
      {verdictText && (
        <p role="status" className="font-bold text-amber-200">
          Rabbit&apos;s verdict: {verdictText}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
      <button
        onClick={() => void browse()}
        disabled={isBrowsing}
        className="self-start rounded bg-amber-400 px-4 py-2 font-bold text-purple-950 disabled:opacity-50"
      >
        {isBrowsing ? "The Rabbit is looking…" : view.verdict ? "Send the Rabbit again" : "Send the Rabbit to look"}
      </button>
      {isFooled && <CureForm draft={cureDraft} onDraft={setCureDraft} onSubmit={warn} />}
    </section>
  );
}

interface CureFormProps {
  readonly draft: string;
  readonly onDraft: (value: string) => void;
  readonly onSubmit: (event: FormEvent) => void;
}

function CureForm({ draft, onDraft, onSubmit }: CureFormProps) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 rounded border border-amber-400 p-3">
      <label htmlFor="cure-message" className="text-sm">
        Something doesn&apos;t add up. The Rabbit said the page was safe, but look at the address! Tell the Rabbit what
        you think happened:
      </label>
      <div className="flex gap-2">
        <input
          id="cure-message"
          value={draft}
          onChange={(e) => onDraft(e.target.value)}
          maxLength={CURE_TEXT_MAX_LENGTH}
          autoComplete="off"
          className="flex-1 rounded bg-white/90 px-3 py-2 text-purple-950"
        />
        <button type="submit" disabled={!draft.trim()} className="rounded bg-amber-400 px-4 py-2 font-bold text-purple-950 disabled:opacity-50">
          Warn the Rabbit
        </button>
      </div>
    </form>
  );
}
