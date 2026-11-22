/**
 * File: components/EndingCard.tsx
 * Purpose: The ending (spec §2): Alice wakes at her real screen. Lists the four lessons and
 *          announces that Looking-Glass mode is unlocked (it lives in the Hall).
 * Author: manasa
 * Date: 2026-11-21
 */
"use client";

import { KEY_PIECES } from "@/lib/constants";
import { GUIDE_LESSON, LESSONS } from "@/lib/lessons";
import { useGameStore } from "@/lib/state/store";

export default function EndingCard() {
  const reset = useGameStore((s) => s.reset);

  function playAgain(): void {
    reset();
    window.location.reload();
  }

  return (
    <section
      aria-label="The end"
      className="flex w-full max-w-[800px] flex-col gap-3 rounded border-2 border-amber-400 bg-purple-950 p-6 text-center"
    >
      <h2 className="text-2xl font-bold">You made it to the garden!</h2>
      <p>
        Alice wakes at her real screen, ready to message her friend safely. Here&apos;s what Wonderland taught her:
      </p>
      <ul className="flex flex-col gap-1 text-left">
        {KEY_PIECES.map((piece) => (
          <li key={piece}>🗝️ {LESSONS[piece]}</li>
        ))}
        <li>🐇 {GUIDE_LESSON}</li>
      </ul>
      <p className="font-bold">Looking-Glass mode is unlocked in the Hall of Doors.</p>
      <div className="flex justify-center gap-3">
        <button onClick={playAgain} className="rounded border border-amber-400 px-5 py-2">
          Play again
        </button>
      </div>
    </section>
  );
}
