/**
 * File: components/LevelOverlay.tsx
 * Purpose: Shows the active level's React UI (dialogue, feedback, lesson card)
 *          based on which Phaser scene is running.
 * Author: varenya
 * Date: 2026-11-21
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { emit, on } from "@/game/bridge";
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

function describeSize({ sizeBefore, sizeAfter }: VerdictOutcome): string | null {
  const change = sizeAfter - sizeBefore;
  if (change > 0) return `You grew! (+${change} size)`;
  if (change < 0) return `You shrank… (${change} size)`;
  return null;
}

export default function LevelOverlay() {
  const [scene, setScene] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [lesson, setLesson] = useState<string | null>(null);
  const applyVerdict = useGameStore((s) => s.applyVerdict);

  useEffect(
    () =>
      on("scene-changed", (next) => {
        setScene(next);
        setFeedback(null);
        setLesson(null);
      }),
    [],
  );

  const handleVerdict = useCallback(
    (verdict: RefereeVerdictType) => {
      const outcome = applyVerdict("cheshire", verdict);
      setFeedback({ verdict, outcome });
      if (outcome.keyAwarded && verdict.lesson) setLesson(verdict.lesson);
    },
    [applyVerdict],
  );
  const exitLevel = useCallback(() => emit("exit-level", null), []);
  const closeLesson = useCallback(() => setLesson(null), []);

  if (scene !== SCENE_CHESHIRE) return null;

  const sizeText = feedback && describeSize(feedback.outcome);
  return (
    <div className="flex w-full max-w-[800px] flex-col gap-3">
      <DialogueBox
        levelId="cheshire"
        npcName={CHESHIRE_PUBLIC.displayName}
        openingLine={CHESHIRE_PUBLIC.openingLine}
        onVerdict={handleVerdict}
      />

      <div aria-live="polite" className="flex flex-col gap-1 text-sm">
        {sizeText && <p className="font-bold">{sizeText}</p>}
        {feedback && feedback.verdict.redFlagsNamed.length > 0 && (
          <p>Red flags you spotted: {feedback.verdict.redFlagsNamed.join(" · ")}</p>
        )}
        {feedback?.outcome.tooSmallForKey && (
          <p className="text-amber-300">
            You saw through the trick, but you&apos;re too small to reach the key! Spot more tricks to grow.
          </p>
        )}
        {feedback?.verdict.oversharedRealInfo && (
          <p className="rounded bg-sky-900/80 p-2">
            <strong>Out of the game for a second:</strong> that looked like real personal information. In real life,
            never share it with strangers online. Nothing you typed here was saved.
          </p>
        )}
      </div>

      <button onClick={exitLevel} className="self-start text-sm underline">
        ← Back to the Hall of Doors
      </button>

      {lesson && <LessonCard piece="cheshire" lesson={lesson} onContinue={exitLevel} onStay={closeLesson} />}
    </div>
  );
}
