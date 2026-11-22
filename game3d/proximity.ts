/**
 * File: game3d/proximity.ts
 * Purpose: "Which interactables am I standing next to?" so boards and claims can be read by walking
 *          up to them, with no aiming. Pure and unit-tested.
 * Date: 2026-11-22
 */
import type { LevelInteractable } from "./level";

/** Walk this close (metres, flat) to a board and it is read automatically. */
export const PROXIMITY_METERS = 1.6;

/** The turn (radians, around the vertical axis) that makes something at (fromX, fromZ) face (toX, toZ). */
export function yawToward(fromX: number, fromZ: number, toX: number, toZ: number): number {
  return Math.atan2(toX - fromX, toZ - fromZ);
}

export function nearbyIds(
  items: readonly LevelInteractable[],
  x: number,
  z: number,
  distance: number,
  isTarget: (id: string) => boolean,
): string[] {
  return items.filter((i) => isTarget(i.id) && Math.hypot(i.pos[0] - x, i.pos[2] - z) <= distance).map((i) => i.id);
}
