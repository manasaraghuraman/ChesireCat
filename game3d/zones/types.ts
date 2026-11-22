/**
 * File: game3d/zones/types.ts
 * Purpose: The contract between the world and a 3D zone (Fall, Hall of Doors, Cheshire).
 *          Zones build visuals into `ctx.root`, read the store, and emit bridge intents.
 *          They never decide game outcomes. Every bridge handler a zone adds is removed in exit().
 * Date: 2026-11-21
 */
import type * as THREE from "three";
import type { LevelData, LevelInteractable, Vec3 } from "../level";

export interface ZoneContext {
  /** Everything added here is disposed when the zone exits. */
  readonly root: THREE.Group;
  readonly camera: THREE.PerspectiveCamera;
  readonly scene: THREE.Scene;
  readonly level: LevelData | null;
  readonly reducedMotion: boolean;
  /** Fade out, swap zones, fade in. */
  readonly goTo: (zoneId: string) => void;
  /** Replaces what the reticle can focus (and their floating labels). */
  readonly setInteractables: (items: readonly LevelInteractable[]) => void;
  /** Zone drives the camera position (e.g. the Fall); null hands it back to the player body. */
  readonly setCinematic: (drive: ((camera: THREE.PerspectiveCamera, dt: number) => void) | null) => void;
  /** Ease the view to look at a point (instant under reduced motion). */
  readonly lookAt: (target: Vec3, seconds?: number) => void;
  /** Release the mouse and freeze movement for a React dialogue. */
  readonly openDialogue: (levelId: string, faceAt: Vec3) => void;
  readonly eyePosition: () => Vec3;
}

export interface Zone {
  /** Scene id, shared with the Phaser build (SCENE_FALL, SCENE_HALL, SCENE_CHESHIRE). */
  readonly id: string;
  /** public/levels/<levelId>.level.json, or null for a zone with no walkable level. */
  readonly levelId: string | null;
  enter(ctx: ZoneContext): void;
  /** Called every rendered frame with seconds since the last frame and since entering. */
  update?(dt: number, elapsed: number): void;
  /** Must remove every bridge handler and timer the zone added. */
  exit(): void;
}
