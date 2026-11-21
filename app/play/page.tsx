/**
 * File: app/play/page.tsx
 * Purpose: Mounts the Phaser game canvas and the React HUD overlay.
 * Author: manasa
 * Date: 2026-11-21
 */
import GameCanvas from "@/components/GameCanvas";
import Hud from "@/components/Hud";

export default function PlayPage() {
  return (
    <main className="relative mx-auto flex min-h-screen max-w-4xl items-center justify-center p-4">
      <GameCanvas />
      <Hud />
    </main>
  );
}
