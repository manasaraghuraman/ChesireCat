/**
 * File: game3d/zones/index.ts
 * Purpose: Zone registry: scene id → a fresh zone instance (Fall, Hall of Doors, Cheshire room, Carbon Maze, Greenwash Check).
 * Date: 2026-11-22
 */
import { SCENE_CHESHIRE, SCENE_FALL, SCENE_HALL, SCENE_MAZE, SCENE_CLUES } from "../../lib/constants";
import { createCheshireZone } from "./cheshire";
import { createFallZone } from "./fall";
import { createHallZone } from "./hall";
import { createMazeZone } from "./maze";
import { createCluesZone } from "./clues";
import type { Zone } from "./types";

const FACTORIES: Readonly<Record<string, () => Zone>> = {
  [SCENE_FALL]: createFallZone,
  [SCENE_HALL]: createHallZone,
  [SCENE_CHESHIRE]: createCheshireZone,
  [SCENE_MAZE]: createMazeZone,
  [SCENE_CLUES]: createCluesZone,
};

export function createZone(id: string): Zone | null {
  return Object.hasOwn(FACTORIES, id) ? (FACTORIES[id]?.() ?? null) : null;
}
