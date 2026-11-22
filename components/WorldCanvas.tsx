/**
 * File: components/WorldCanvas.tsx
 * Purpose: Client component that mounts the three.js + Rapier world full-window and owns its
 *          lifecycle. Feeds the store's size into the world. three, Rapier and game3d/ are imported
 *          only inside useEffect so nothing touches WebGL during server rendering.
 *          HUD, pause menu and overlays are siblings rendered by the page.
 * Date: 2026-11-21
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { emit } from "@/game/bridge";
import { useGameStore } from "@/lib/state/store";
import { useSettings } from "./useSettings";

type Status = "loading" | "ready" | "error";

const LOAD_ERROR = "The 3D world couldn't load. Try a desktop browser with WebGL 2.";

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

interface WorldCanvasProps {
  /** Zone to start in (SCENE_FALL for the real game). */
  readonly startZone: string;
}

export default function WorldCanvas({ startZone }: WorldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let isCancelled = false;
    let cleanup: (() => void) | undefined;
    setStatus("loading");

    void (async () => {
      try {
        const { createWorld } = await import("@/game3d/world");
        useSettings.getState().load();
        const world = await createWorld(canvas, {
          startZone,
          initialSize: useGameStore.getState().size,
          reducedMotion: prefersReducedMotion(),
          settings: useSettings.getState().settings,
        });
        if (isCancelled) {
          world.dispose();
          return;
        }
        const offSize = useGameStore.subscribe((state, previous) => {
          if (state.size !== previous.size) world.setSize(state.size);
        });
        const offSettings = useSettings.subscribe((state) => world.setSettings(state.settings));
        // Saved progress may rehydrate after mount; resync once.
        world.setSize(useGameStore.getState().size);
        cleanup = () => {
          offSize();
          offSettings();
          world.dispose();
        };
        setStatus("ready");
      } catch (error) {
        console.error("[WorldCanvas] failed to start the 3D world", error);
        if (!isCancelled) setStatus("error");
      }
    })();

    return () => {
      isCancelled = true;
      cleanup?.();
    };
  }, [startZone]);

  return (
    <div className="fixed inset-0 bg-[#2a1f3d]">
      <canvas
        ref={canvasRef}
        onClick={() => emit("capture-request", null)}
        onMouseDown={(event) => event.preventDefault()} // drag-to-look must not select HUD text
        aria-label="First-person 3D world"
        className="block h-full w-full"
      />
      {status === "loading" && (
        <p role="status" className="absolute inset-0 z-40 flex items-center justify-center bg-[#2a1f3d] text-amber-100">
          Falling into the world…
        </p>
      )}
      {status === "error" && (
        <p role="alert" className="absolute inset-0 z-40 flex items-center justify-center bg-[#2a1f3d] p-6 text-center text-amber-100">
          {LOAD_ERROR}
        </p>
      )}
    </div>
  );
}
