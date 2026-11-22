/**
 * File: components/RewindEffect.tsx
 * Purpose: "The Hatter's stopped clock": when a rewind succeeds, tint the screen and sweep a clock
 *          hand backwards. Under reduced motion (OS or in-game) it's just a brief tint.
 * Date: 2026-11-21
 */
"use client";

import { useEffect, useState } from "react";
import { on } from "@/game/bridge";
import { useSettings } from "./useSettings";

const EFFECT_MS = 1100;
const REDUCED_MS = 450;

export default function RewindEffect() {
  const [playing, setPlaying] = useState(0);
  const reducedSetting = useSettings((s) => s.settings.reducedMotion);

  useEffect(() => on("rewind", () => setPlaying((n) => n + 1)), []);
  useEffect(() => {
    if (!playing) return undefined;
    const osReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = setTimeout(() => setPlaying(0), osReduced || reducedSetting ? REDUCED_MS : EFFECT_MS);
    return () => clearTimeout(timer);
  }, [playing, reducedSetting]);

  if (!playing) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-sky-900/45 mix-blend-multiply">
      <svg viewBox="0 0 100 100" className="h-40 w-40 opacity-90 motion-reduce:hidden" style={{ display: reducedSetting ? "none" : undefined }}>
        <circle cx="50" cy="50" r="44" fill="#f5ecd7" stroke="#3b2a12" strokeWidth="4" />
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1="50" y1="10" x2="50" y2="16" stroke="#3b2a12" strokeWidth="3" transform={`rotate(${i * 30} 50 50)`} />
        ))}
        <line x1="50" y1="50" x2="50" y2="18" stroke="#b74439" strokeWidth="4" strokeLinecap="round" className="origin-center animate-[rewind-sweep_1.1s_ease-in-out]" />
        <circle cx="50" cy="50" r="4" fill="#3b2a12" />
      </svg>
      <p className="absolute bottom-1/3 font-serif text-2xl font-bold text-white drop-shadow">Rewind!</p>
    </div>
  );
}
