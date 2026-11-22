/**
 * File: components/LevelOverlay.tsx
 * Purpose: Picks the React UI for whichever Phaser scene is running (hub, a trial, the Trial,
 *          the ending) and keeps the server session alive for the page's lifetime.
 * Author: varenya
 * Date: 2026-11-21 (updated: routes every scene, owns the session lifecycle)
 */
"use client";

import { useEffect, useState } from "react";
import { on } from "@/game/bridge";
import { endSessionOnLeave, ensureSession } from "@/lib/client/session";
import {
  SCENE_CATERPILLAR,
  SCENE_CHESHIRE,
  SCENE_GARDEN,
  SCENE_HALL,
  SCENE_HATTER,
  SCENE_QUEEN,
  SCENE_TRIAL,
} from "@/lib/constants";
import type { KeyPieceType } from "@/lib/schemas";
import EndingCard from "./EndingCard";
import HallPanel from "./HallPanel";
import NpcLevelPanel from "./NpcLevelPanel";
import TrialPanel from "./TrialPanel";

const NPC_SCENES: Readonly<Record<string, KeyPieceType>> = {
  [SCENE_CATERPILLAR]: "caterpillar",
  [SCENE_CHESHIRE]: "cheshire",
  [SCENE_HATTER]: "hatter",
  [SCENE_QUEEN]: "queen",
};

export default function LevelOverlay() {
  const [scene, setScene] = useState<string | null>(null);

  useEffect(() => on("scene-changed", setScene), []);
  useEffect(() => {
    ensureSession().catch(() => undefined); // levels that need a session retry and show their own error
    window.addEventListener("pagehide", endSessionOnLeave);
    return () => window.removeEventListener("pagehide", endSessionOnLeave);
  }, []);

  if (scene === null) return null;
  const piece = NPC_SCENES[scene];
  if (piece) return <NpcLevelPanel key={scene} piece={piece} />;
  if (scene === SCENE_HALL) return <HallPanel />;
  if (scene === SCENE_TRIAL) return <TrialPanel />;
  if (scene === SCENE_GARDEN) return <EndingCard />;
  return null;
}
