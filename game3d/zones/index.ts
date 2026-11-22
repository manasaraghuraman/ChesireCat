/**
 * File: game3d/zones/index.ts
 * Purpose: Zone registry: scene id → a fresh zone instance.
 * Date: 2026-11-21
 */
import { SCENE_CHESHIRE, SCENE_FALL, SCENE_HALL } from "../../lib/constants";
import { createCheshireZone } from "./cheshire";
import { createFallZone } from "./fall";
import { createHallZone } from "./hall";
import type { Zone } from "./types";

const FACTORIES: Readonly<Record<string, () => Zone>> = {
  [SCENE_FALL]: createFallZone,
  [SCENE_HALL]: createHallZone,
  [SCENE_CHESHIRE]: createCheshireZone,
};

export function createZone(id: string): Zone | null {
  return Object.hasOwn(FACTORIES, id) ? (FACTORIES[id]?.() ?? null) : null;
}
