/**
 * File: components/LevelOverlay.tsx
 * Purpose: The overlay: a message bar for instructions and right/wrong feedback, a key card whenever a
 *          key piece is earned, and the end card when the garden opens. The mouse is released when a card
 *          opens so its buttons can be clicked, and H returns to the Hall from any mini game.
 * Author: manasa
 * Date: 2026-11-22
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { emit, on, type BridgeEvents } from "@/game/bridge";
import { SCENE_CHESHIRE, SCENE_MAZE, SCENE_CLUES } from "@/lib/constants";
import { useGameStore } from "@/lib/state/store";
import LessonCard from "./LessonCard";

type Hint = BridgeEvents["hint"];
type Won = BridgeEvents["game-won"];

const MINI_GAME_SCENES: ReadonlySet<string> = new Set([SCENE_CHESHIRE, SCENE_MAZE, SCENE_CLUES]);
const TONE_CLASS: Readonly<Record<Hint["tone"], string>> = {
  info: "bg-black/80 text-amber-50",
  good: "bg-emerald-800/95 text-white",
  bad: "bg-red-900/95 text-white",
};

export default function LevelOverlay() {
  const [scene, setScene] = useState<string | null>(null);
  const [hint, setHint] = useState<Hint | null>(null);
  const [keyCard, setKeyCard] = useState<{ piece: string; lesson: string } | null>(null);
  const [won, setWon] = useState<Won | null>(null);

  const goToHall = useCallback(() => {
    setKeyCard(null);
    setWon(null);
    emit("exit-level", null);
  }, []);

  useEffect(() => {
    const offs = [
      on("scene-changed", (next) => {
        setScene(next);
        setKeyCard(null);
        setHint(null);
      }),
      on("hint", setHint),
      on("key-awarded", ({ piece, lesson }) => {
        document.exitPointerLock?.(); // free the cursor so the card's buttons can be clicked
        setKeyCard({ piece, lesson: lesson ?? "" });
      }),
      on("game-won", (payload) => {
        document.exitPointerLock?.();
        setWon(payload);
      }),
    ];
    return () => offs.forEach((off) => off());
  }, []);

  // H = back to the Hall of Doors, from any mini game (works while the mouse is captured).
  useEffect(() => {
    if (scene === null || !MINI_GAME_SCENES.has(scene)) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "h" && !event.repeat) goToHall();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scene, goToHall]);

  function startOver(): void {
    useGameStore.getState().reset();
    window.location.reload();
  }

  return (
    <>
      {hint && (
        <p
          role="status"
          aria-live="polite"
          className={`fixed left-1/2 top-20 z-30 w-[min(44rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg px-4 py-3 text-center font-sans text-base shadow-lg ${TONE_CLASS[hint.tone]}`}
        >
          {hint.text}
        </p>
      )}
      {keyCard && (
        <div className="relative z-40">
          <LessonCard piece={keyCard.piece} lesson={keyCard.lesson} onContinue={goToHall} onStay={() => setKeyCard(null)} />
        </div>
      )}
      {won && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4 font-sans">
          <div role="dialog" aria-modal="true" className="max-w-md rounded-lg border-2 border-amber-400 bg-purple-950 p-6 text-center text-white">
            <h2 className="text-2xl font-bold">{won.title ?? "You won!"}</h2>
            <p className="mt-3">{won.lesson}</p>
            <div className="mt-5 flex justify-center gap-3">
              <button type="button" onClick={() => setWon(null)} className="rounded bg-amber-400 px-5 py-2 font-bold text-purple-950">
                Keep exploring
              </button>
              <button type="button" onClick={startOver} className="rounded border border-amber-400 px-5 py-2">
                Start over
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
