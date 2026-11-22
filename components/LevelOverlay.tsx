/**
 * File: components/LevelOverlay.tsx
 * Purpose: Shows the active level's React UI (dialogue, feedback, lesson card) over the 3D world.
 *          The dialogue appears while "dialogue-open" is active in the Cheshire zone; Referee
 *          feedback appears as HUD toasts. Verdict handling and every message are unchanged.
 * Author: varenya
 * Date: 2026-11-21
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { emit, on } from "@/game/bridge";
import type { NpcAction } from "@/lib/agents/actions";
import { CHESHIRE_PUBLIC } from "@/lib/agents/personas/cheshire.public";
import { SCENE_CHESHIRE } from "@/lib/constants";
import type { RefereeVerdictType } from "@/lib/schemas";
import { useGameStore, type VerdictOutcome } from "@/lib/state/store";
import DialogueBox from "./DialogueBox";
import LessonCard from "./LessonCard";

interface Feedback {
  readonly verdict: RefereeVerdictType;
  readonly outcome: VerdictOutcome;
}

const TOAST_SECONDS = 12;

function describeSize({ sizeBefore, sizeAfter }: VerdictOutcome): string | null {
  const change = sizeAfter - sizeBefore;
  if (change > 0) return `You grew! (+${change} size)`;
  if (change < 0) return `You shrank… (${change} size)`;
  return null;
}

export default function LevelOverlay() {
  const [scene, setScene] = useState<string | null>(null);
  const [isDialogueOpen, setIsDialogueOpen] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [lesson, setLesson] = useState<string | null>(null);
  const [replayUrl, setReplayUrl] = useState<string | null>(null);
  const applyVerdict = useGameStore((s) => s.applyVerdict);
  const rewindsLeft = useGameStore((s) => s.rewindsLeft.cheshire ?? 0);

  useEffect(() => {
    const offs = [
      on("scene-changed", (next) => {
        setScene(next);
        setFeedback(null);
        setLesson(null);
        setIsDialogueOpen(false);
      }),
      on("dialogue-open", ({ levelId }) => setIsDialogueOpen(levelId === "cheshire")),
      on("dialogue-close", () => setIsDialogueOpen(false)),
      on("rabbit-replay", setReplayUrl),
      // A key held for the Rabbit was awarded when he was cured.
      on("key-awarded", ({ lesson: awarded }) => {
        if (awarded) setLesson(awarded);
      }),
    ];
    return () => offs.forEach((off) => off());
  }, []);

  // Toasts fade after a while.
  useEffect(() => {
    if (!feedback) return undefined;
    const timer = setTimeout(() => setFeedback(null), TOAST_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const handleVerdict = useCallback(
    (verdict: RefereeVerdictType) => {
      const outcome = applyVerdict("cheshire", verdict);
      setFeedback({ verdict, outcome });
      if (outcome.keyAwarded && verdict.lesson) setLesson(verdict.lesson);
    },
    [applyVerdict],
  );
  const handleAction = useCallback((action: NpcAction) => {
    if (action.action === "open_page" && action.url) emit("show-page", { url: action.url });
  }, []);
  const closeDialogue = useCallback(() => emit("dialogue-close", null), []);
  const exitLevel = useCallback(() => {
    emit("dialogue-close", null);
    emit("exit-level", null);
  }, []);
  const closeLesson = useCallback(() => setLesson(null), []);
  const rewind = useCallback(() => {
    if (!useGameStore.getState().rewind("cheshire")) return;
    emit("rewind", null);
    setFeedback(null);
  }, []);

  // Esc closes the dialogue (the lesson card handles its own Esc).
  useEffect(() => {
    if (!isDialogueOpen || lesson) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDialogue();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isDialogueOpen, lesson, closeDialogue]);

  if (scene !== SCENE_CHESHIRE) return null;

  const sizeText = feedback && describeSize(feedback.outcome);
  return (
    <>
      {/* Kept mounted (hidden) while in the wood so the conversation survives closing it. */}
      <div
        hidden={!isDialogueOpen}
        className="fixed bottom-4 left-1/2 z-30 w-[min(60rem,calc(100vw-2rem))] -translate-x-1/2 md:w-[60%]"
      >
        <DialogueBox
          levelId="cheshire"
          npcName={CHESHIRE_PUBLIC.displayName}
          openingLine={CHESHIRE_PUBLIC.openingLine}
          onVerdict={handleVerdict}
          onAction={handleAction}
          isActive={isDialogueOpen}
        />
        <div className="mt-2 flex justify-between font-sans text-sm text-amber-100">
          <button type="button" onClick={closeDialogue} className="rounded bg-black/60 px-3 py-1 hover:bg-black/80">
            Back <span className="text-amber-100/60">(Esc)</span>
          </button>
          <button type="button" onClick={exitLevel} className="rounded bg-black/60 px-3 py-1 underline hover:bg-black/80">
            ← Back to the Hall of Doors
          </button>
        </div>
      </div>

      <div aria-live="polite" className="fixed right-4 top-24 z-20 flex w-80 flex-col gap-2 font-sans text-sm">
        {sizeText && <p className="rounded-lg bg-black/70 px-3 py-2 font-bold text-white shadow">{sizeText}</p>}
        {feedback && feedback.verdict.redFlagsNamed.length > 0 && (
          <p className="rounded-lg bg-black/70 px-3 py-2 text-white shadow">
            Red flags you spotted: {feedback.verdict.redFlagsNamed.join(" · ")}
          </p>
        )}
        {feedback?.verdict.outcome === "fell_for_it" && rewindsLeft > 0 && (
          <button
            type="button"
            onClick={rewind}
            className="pointer-events-auto self-start rounded-lg bg-sky-800/90 px-3 py-2 font-semibold text-white shadow hover:bg-sky-700"
          >
            ⏱ Rewind to before that ({rewindsLeft} left)
          </button>
        )}
        {feedback?.outcome.heldForRabbit && (
          <p className="rounded-lg bg-black/70 px-3 py-2 text-amber-300 shadow">
            You saw through the Cat! But the White Rabbit still trusts that page. Help him see the trick to earn the key.
          </p>
        )}
        {feedback?.outcome.tooSmallForKey && (
          <p className="rounded-lg bg-black/70 px-3 py-2 text-amber-300 shadow">
            You saw through the trick, but you&apos;re too small to reach the key! Spot more tricks to grow.
          </p>
        )}
        {feedback?.verdict.oversharedRealInfo && (
          <p className="rounded-lg bg-sky-900/90 px-3 py-2 text-white shadow">
            <strong>Out of the game for a second:</strong> that looked like real personal information. In real life,
            never share it with strangers online. Nothing you typed here was saved.
          </p>
        )}
      </div>

      {lesson && (
        <div className="relative z-40">
          <LessonCard piece="cheshire" lesson={lesson} onContinue={exitLevel} onStay={closeLesson} replayUrl={replayUrl} />
        </div>
      )}
    </>
  );
}
