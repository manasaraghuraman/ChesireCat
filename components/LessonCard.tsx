/**
 * File: components/LessonCard.tsx
 * Purpose: Shown when a key piece is earned: names the lesson in one line.
 * Author: varenya
 * Date: 2026-11-21 (updated: optional Solari replay link, guide lesson)
 */
"use client";

import { useEffect, useRef } from "react";

interface Props {
  readonly piece: string;
  readonly lesson: string;
  /** Solari replay of the moment the Rabbit was fooled (https only, validated server-side). */
  readonly replayUrl?: string | null;
  /** Extra lesson line, e.g. the guide lesson after curing the Rabbit. */
  readonly extraLesson?: string;
  readonly onContinue: () => void;
  readonly onStay: () => void;
}

export default function LessonCard({ piece, lesson, replayUrl, extraLesson, onContinue, onStay }: Props) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    buttonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onStay();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onStay]);

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/70 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lesson-title"
        className="max-w-md rounded-lg border-2 border-amber-400 bg-purple-950 p-6 text-center"
      >
        <p className="text-4xl" aria-hidden="true">
          🗝️
        </p>
        <h2 id="lesson-title" className="mt-2 text-2xl font-bold">
          You earned the {piece} key piece!
        </h2>
        <p className="mt-4 text-lg">{lesson}</p>
        {extraLesson && <p className="mt-2">{extraLesson}</p>}
        {replayUrl && (
          <p className="mt-3 text-sm">
            <a href={replayUrl} target="_blank" rel="noopener noreferrer" className="underline">
              Watch the moment the Rabbit was fooled (opens a recording)
            </a>
          </p>
        )}
        <div className="mt-6 flex justify-center gap-3">
          <button
            ref={buttonRef}
            onClick={onContinue}
            className="rounded bg-amber-400 px-5 py-2 font-bold text-purple-950"
          >
            Back to the Hall
          </button>
          <button onClick={onStay} className="rounded border border-amber-400 px-5 py-2">
            Keep talking
          </button>
        </div>
      </div>
    </div>
  );
}
