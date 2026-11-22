/**
 * File: components/FallPopup.tsx
 * Purpose: The forced mistake that starts the game (Appendix A Act 1): a loud "I'm late! Hop in the car!"
 *          pop-up over the dark shaft. Clicking it captures the mouse and starts the fall.
 * Date: 2026-11-21
 */
"use client";

import { useEffect, useState } from "react";
import { emit } from "@/game/bridge";
import { SCENE_FALL } from "@/lib/constants";
import { useWorldUi } from "./useWorldUi";

export default function FallPopup() {
  const { scene } = useWorldUi();
  const [clicked, setClicked] = useState(false);

  useEffect(() => {
    if (scene !== SCENE_FALL) setClicked(false);
  }, [scene]);

  if (scene !== SCENE_FALL || clicked) return null;

  const click = () => {
    setClicked(true);
    emit("capture-request", null); // inside the click, so the browser allows pointer lock
    emit("fall-start", null);
  };

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center p-4 font-sans">
      <div
        role="dialog"
        aria-labelledby="popup-title"
        className="w-full max-w-sm -rotate-2 rounded-xl border-4 border-red-600 bg-white p-6 text-center shadow-[0_0_60px_rgba(255,60,60,0.6)]"
      >
        <p className="text-sm font-bold uppercase tracking-widest text-red-600">🐇 Hurry!!!</p>
        <h1 id="popup-title" className="my-3 text-2xl font-black leading-snug text-red-700">
          I&apos;m late! I&apos;m late for a very important date!
          <br />
          I can&apos;t get to the meeting until I can open the garden door!
        </h1>
        <button
          type="button"
          onClick={click}
          autoFocus
          className="w-full animate-pulse rounded-lg bg-red-600 px-4 py-3 text-xl font-black text-white motion-reduce:animate-none"
        >
          FOLLOW THE RABBIT
        </button>
      </div>
    </div>
  );
}
