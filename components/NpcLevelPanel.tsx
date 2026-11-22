/**
 * File: components/NpcLevelPanel.tsx
 * Purpose: React UI for one NPC trial: dialogue, Referee feedback, rewind (spec §3.3), lesson card.
 *          Cheshire adds the White Rabbit twist; its key is held until the Rabbit is cured.
 * Author: manasa
 * Date: 2026-11-21
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { emit } from "@/game/bridge";
import { NPC_PUBLIC } from "@/lib/agents/personas/public";
import { rewindLevel, startLevel } from "@/lib/client/requests";
import { GUIDE_LESSON } from "@/lib/lessons";
import type { KeyPieceType, RefereeVerdictType } from "@/lib/schemas";
import { useGameStore, type RewindSnapshot, type VerdictOutcome } from "@/lib/state/store";
import DialogueBox from "./DialogueBox";
import LessonCard from "./LessonCard";
import RabbitPanel from "./RabbitPanel";

interface Props {
  readonly piece: KeyPieceType;
}

interface Feedback {
  readonly verdict: RefereeVerdictType;
  readonly outcome: VerdictOutcome;
}

const HELD_KEY_HINT = "You saw through the Cat, but the Rabbit is still fooled! Warn it to claim the key piece.";
const START_ERROR = "Wonderland's web is still waking up. The Rabbit may need a moment.";

function describeSize({ sizeBefore, sizeAfter }: VerdictOutcome): string | null {
  const change = sizeAfter - sizeBefore;
  if (change > 0) return `You grew! (+${change} size)`;
  if (change < 0) return `You shrank… (${change} size)`;
  return null;
}

/** Strips the key from a verdict so size still applies but the piece waits for the Rabbit cure. */
function withoutKey(verdict: RefereeVerdictType): RefereeVerdictType {
  return { ...verdict, keyEarned: false, levelComplete: false, lesson: null };
}

export default function NpcLevelPanel({ piece }: Props) {
  const npc = NPC_PUBLIC[piece];
  const isCheshire = piece === "cheshire";
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [lesson, setLesson] = useState<{ readonly text: string; readonly isGuide: boolean } | null>(null);
  const [heldVerdict, setHeldVerdict] = useState<RefereeVerdictType | null>(null);
  const [replayUrl, setReplayUrl] = useState<string | null>(null);
  const [rewindToken, setRewindToken] = useState(0);
  const [hasCheckpoint, setHasCheckpoint] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const checkpoint = useRef<RewindSnapshot | null>(null);
  const applyVerdict = useGameStore((s) => s.applyVerdict);
  const takeSnapshot = useGameStore((s) => s.takeSnapshot);
  const restoreSnapshot = useGameStore((s) => s.restoreSnapshot);
  const consumeRewind = useGameStore((s) => s.useRewind);
  const setRabbitCured = useGameStore((s) => s.setRabbitCured);
  const isRabbitCured = useGameStore((s) => s.rabbitCured);
  const rewindsLeft = useGameStore((s) => s.rewindsLeft[piece] ?? 0);

  useEffect(() => {
    if (!isCheshire) return;
    startLevel(piece, useGameStore.getState().rabbitCured).catch(() => setStartError(START_ERROR));
  }, [isCheshire, piece]);

  const handleVerdict = useCallback(
    (verdict: RefereeVerdictType) => {
      const isHeld = isCheshire && !useGameStore.getState().rabbitCured && verdict.keyEarned;
      const outcome = applyVerdict(piece, isHeld ? withoutKey(verdict) : verdict);
      setFeedback({ verdict, outcome });
      setHeldVerdict(isHeld ? verdict : null);
      if (outcome.keyAwarded && verdict.lesson) setLesson({ text: verdict.lesson, isGuide: false });
    },
    [applyVerdict, isCheshire, piece],
  );

  const handleCured = useCallback(() => {
    setRabbitCured(true);
    if (!heldVerdict) return;
    const outcome = applyVerdict(piece, { ...heldVerdict, sizeDelta: 0 });
    setFeedback({ verdict: heldVerdict, outcome });
    if (outcome.keyAwarded && heldVerdict.lesson) setLesson({ text: heldVerdict.lesson, isGuide: true });
    setHeldVerdict(null);
  }, [applyVerdict, heldVerdict, piece, setRabbitCured]);

  const handleBeforeSend = useCallback(() => {
    checkpoint.current = takeSnapshot();
    setHasCheckpoint(true);
  }, [takeSnapshot]);

  function rewind(): void {
    const snapshot = checkpoint.current;
    if (!snapshot || !consumeRewind(piece)) return;
    restoreSnapshot(snapshot);
    checkpoint.current = null;
    setHasCheckpoint(false);
    setFeedback(null);
    setHeldVerdict(null);
    setLesson(null);
    setRewindToken((token) => token + 1);
    void rewindLevel(piece);
  }

  const exitLevel = useCallback(() => emit("exit-level", null), []);
  const closeLesson = useCallback(() => setLesson(null), []);
  const sizeText = feedback && describeSize(feedback.outcome);

  return (
    <div className="flex w-full max-w-[800px] flex-col gap-3">
      <DialogueBox
        levelId={piece}
        npcName={npc.displayName}
        openingLine={npc.openingLine}
        onVerdict={handleVerdict}
        onBeforeSend={handleBeforeSend}
        rewindToken={rewindToken}
      />
      <FeedbackNotes feedback={feedback} sizeText={sizeText} isHeld={heldVerdict !== null} />
      {isCheshire && (
        <>
          {startError && <p role="alert" className="text-sm text-amber-300">{startError}</p>}
          <RabbitPanel isCured={isRabbitCured} onCured={handleCured} onReplay={setReplayUrl} />
        </>
      )}
      <div className="flex gap-4 text-sm">
        <button onClick={exitLevel} className="underline">
          ← Back to the Hall of Doors
        </button>
        <button onClick={rewind} disabled={!hasCheckpoint || rewindsLeft <= 0} className="underline disabled:opacity-50">
          ⏪ Rewind the last choice ({rewindsLeft} left)
        </button>
      </div>
      {lesson && (
        <LessonCard
          piece={piece}
          lesson={lesson.text}
          replayUrl={replayUrl}
          extraLesson={lesson.isGuide ? GUIDE_LESSON : undefined}
          onContinue={exitLevel}
          onStay={closeLesson}
        />
      )}
    </div>
  );
}

interface FeedbackProps {
  readonly feedback: Feedback | null;
  readonly sizeText: string | null;
  readonly isHeld: boolean;
}

function FeedbackNotes({ feedback, sizeText, isHeld }: FeedbackProps) {
  return (
    <div aria-live="polite" className="flex flex-col gap-1 text-sm">
      {sizeText && <p className="font-bold">{sizeText}</p>}
      {feedback && feedback.verdict.redFlagsNamed.length > 0 && (
        <p>Red flags you spotted: {feedback.verdict.redFlagsNamed.join(" · ")}</p>
      )}
      {isHeld && <p className="text-amber-300">{HELD_KEY_HINT}</p>}
      {feedback?.outcome.tooSmallForKey && (
        <p className="text-amber-300">
          You saw through the trick, but you&apos;re too small to reach the key! Spot more tricks to grow.
        </p>
      )}
      {feedback?.verdict.oversharedRealInfo && (
        <p className="rounded bg-sky-900/80 p-2">
          <strong>Out of the game for a second:</strong> that looked like real personal information. In real life, never
          share it with strangers online. Nothing you typed here was saved.
        </p>
      )}
    </div>
  );
}
