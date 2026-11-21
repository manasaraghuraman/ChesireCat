/**
 * File: components/GameCanvas.tsx
 * Purpose: Client component that mounts and tears down the Phaser game.
 * Author: manasa
 * Date: 2026-11-21
 */
"use client";

import { useEffect, useRef } from "react";
import type { Game } from "phaser";

export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let game: Game | undefined;
    let isCancelled = false;
    const container = containerRef.current;
    if (!container) return undefined;

    void (async () => {
      try {
        const [{ Game: PhaserGame }, { createGameConfig }] = await Promise.all([
          import("phaser"),
          import("@/game/config"),
        ]);
        if (!isCancelled) game = new PhaserGame(createGameConfig(container));
      } catch (error) {
        console.error("Failed to start game", error);
      }
    })();

    return () => {
      isCancelled = true;
      game?.destroy(true);
    };
  }, []);

  return <div ref={containerRef} aria-label="Game canvas" />;
}
