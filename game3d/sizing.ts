/**
 * File: game3d/sizing.ts
 * Purpose: Maps the store's size (0–100) to Alice's first-person body: eye height, collider,
 *          interact reach, reachable height and speed. Pure and unit-tested. Presentation only:
 *          the store decides size; this just makes it physical.
 * Date: 2026-11-21
 */
import { SIZE_START, SIZE_TOO_SMALL } from "../lib/constants";
import { SIZE_SCALING as s } from "./config";

export interface BodyDims {
  readonly ratio: number;
  readonly eyeHeight: number;
  readonly colliderHeight: number;
  readonly colliderRadius: number;
  /** Horizontal interact distance. */
  readonly reach: number;
  /** Highest point above the feet Alice can reach (gates `key` interactables). */
  readonly reachHeight: number;
  /** Multiplier on walk/hurry speed. */
  readonly speedScale: number;
}

/** size / SIZE_START, clamped so the camera never sinks into the floor or clips the ceiling. */
export function sizeRatio(size: number): number {
  const ratio = (Number.isFinite(size) ? size : SIZE_START) / SIZE_START;
  return Math.min(s.maxRatio, Math.max(s.minRatio, ratio));
}

export function bodyForSize(size: number): BodyDims {
  const ratio = sizeRatio(size);
  return {
    ratio,
    eyeHeight: s.baseEyeHeight * ratio,
    colliderHeight: s.baseColliderHeight * ratio,
    colliderRadius: s.baseColliderRadius * ratio,
    reach: s.baseReach * ratio,
    reachHeight: s.baseReachHeight * ratio,
    speedScale: ratio ** s.speedExponent,
  };
}

/**
 * Height of the key on the glass table: exactly what Alice can reach at SIZE_TOO_SMALL, so
 * below that size she physically can't, matching the store's `tooSmallForKey` rule.
 */
export const KEY_HEIGHT = bodyForSize(SIZE_TOO_SMALL).reachHeight;
