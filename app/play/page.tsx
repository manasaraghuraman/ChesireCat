/**
 * File: app/play/page.tsx
 * Purpose: Mounts the Phaser game canvas, the React HUD, and level overlays.
 * Author: manasa
 * Date: 2026-11-21
 */
import GameCanvas from "@/components/GameCanvas";
import Hud from "@/components/Hud";
import LevelOverlay from "@/components/LevelOverlay";

export default function PlayPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-4 p-4">
      <div className="relative">
        <GameCanvas />
        <Hud />
      </div>
      <LevelOverlay />
    </main>
  );
}
