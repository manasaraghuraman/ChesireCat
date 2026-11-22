/**
 * File: components/useWorldUi.ts
 * Purpose: Shared React view of the 3D world's UI state, read from bridge events:
 *          whether controls are captured, what the reticle is on, and dialogue state.
 * Date: 2026-11-21
 */
"use client";

import { useEffect, useState } from "react";
import { on, type FocusPayload } from "@/game/bridge";

export interface WorldUi {
  /** Controls captured (pointer lock, or the drag-to-look fallback). */
  readonly locked: boolean;
  /** Has the player captured the controls at least once? ("Start" vs "Resume"). */
  readonly started: boolean;
  readonly focus: FocusPayload | null;
  readonly dialogueOpen: boolean;
  /** Dialogue just closed: show "Click to look around" rather than the pause menu. */
  readonly awaitingClick: boolean;
  /** Current scene id (SCENE_FALL, SCENE_HALL, SCENE_CHESHIRE, …), null while loading. */
  readonly scene: string | null;
}

export function useWorldUi(): WorldUi {
  const [locked, setLocked] = useState(false);
  const [started, setStarted] = useState(false);
  const [focus, setFocus] = useState<FocusPayload | null>(null);
  const [dialogueOpen, setDialogueOpen] = useState(false);
  const [awaitingClick, setAwaitingClick] = useState(false);
  const [scene, setScene] = useState<string | null>(null);

  useEffect(() => {
    const offs = [
      on("pointer-lock", (isLocked) => {
        setLocked(isLocked);
        if (isLocked) {
          setStarted(true);
          setAwaitingClick(false);
        }
      }),
      on("focus-changed", setFocus),
      on("scene-changed", setScene),
      on("dialogue-open", () => {
        setDialogueOpen(true);
        setAwaitingClick(false);
      }),
      on("dialogue-close", () => {
        setDialogueOpen(false);
        setAwaitingClick(true);
      }),
    ];
    return () => offs.forEach((off) => off());
  }, []);

  return { locked, started, focus, dialogueOpen, awaitingClick, scene };
}
