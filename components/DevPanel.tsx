/**
 * File: components/DevPanel.tsx
 * Purpose: DEV-ONLY controls (add ?dev to the URL): change size by ±20 through the real store
 *          action, pop the Cat's page up, and show the last `interact` intent. Renders nothing in
 *          production.
 * Date: 2026-11-21
 */
"use client";

import { useEffect, useState } from "react";
import { emit, on } from "@/game/bridge";
import { SIZE_START } from "@/lib/constants";
import { useGameStore } from "@/lib/state/store";
import { FREE_CROWN_PAGE } from "@/lib/wonderweb/display";

const STEP = 20;

export default function DevPanel() {
  const changeSize = useGameStore((s) => s.changeSize);
  const size = useGameStore((s) => s.size);
  const [lastInteract, setLastInteract] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => on("interact", ({ id }) => setLastInteract(id)), []);
  useEffect(() => setIsEnabled(new URLSearchParams(window.location.search).has("dev")), []);

  if (process.env.NODE_ENV === "production" || !isEnabled) return null;

  const button = "rounded bg-white/15 px-2 py-1 font-mono hover:bg-white/25";
  return (
    <div className="fixed bottom-4 right-4 z-30 flex flex-col gap-2 rounded-lg bg-black/70 p-3 font-sans text-xs text-white">
      <p className="font-bold text-amber-300">Dev · size {size}</p>
      <div className="flex gap-2">
        <button type="button" className={button} onClick={() => changeSize(-STEP)}>
          −{STEP}
        </button>
        <button type="button" className={button} onClick={() => changeSize(STEP)}>
          +{STEP}
        </button>
        <button type="button" className={button} onClick={() => changeSize(SIZE_START - size)}>
          reset
        </button>
      </div>
      <button type="button" className={button} onClick={() => emit("show-page", { url: FREE_CROWN_PAGE.url })}>
        show crown page
      </button>
      <p className="text-white/70">Last E: {lastInteract ?? "—"}</p>
      <p className="text-white/50">Press Esc to free the mouse first.</p>
    </div>
  );
}
