/**
 * File: components/Hud.tsx
 * Purpose: React HUD overlay showing size, key pieces, and rewinds left.
 * Author: manasa
 * Date: 2026-11-21
 */
"use client";

import { KEY_PIECES } from "@/lib/constants";
import { useGameStore } from "@/lib/state/store";

export default function Hud() {
  const size = useGameStore((s) => s.size);
  const keys = useGameStore((s) => s.keys);
  const rewinds = useGameStore((s) => s.rewindsLeft[s.currentLevel] ?? 0);

  return (
    <aside
      aria-live="polite"
      className="absolute left-6 top-6 rounded bg-black/60 p-3 text-sm"
    >
      <p>Size: {size}</p>
      <p>
        Key pieces: {keys.length}/{KEY_PIECES.length}
      </p>
      <p>Rewinds: {rewinds}</p>
    </aside>
  );
}
