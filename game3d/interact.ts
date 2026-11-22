/**
 * File: game3d/interact.ts
 * Purpose: Picks what the reticle is on: a ray from the eye, plus anything within reach that sits
 *          inside a small cone around the view direction. Pure and unit-tested. It only reports
 *          focus; pressing E emits an intent and something else decides what happens.
 * Date: 2026-11-21
 */
import type { InteractableKind, LevelInteractable, Vec3 } from "./level";

export type FocusReason = "locked" | "too-small";

export interface Viewer {
  readonly eye: Vec3;
  /** Unit view direction. */
  readonly dir: Vec3;
  readonly feetY: number;
  readonly reach: number;
  readonly reachHeight: number;
}

export interface Focus {
  readonly id: string;
  readonly kind: InteractableKind;
  readonly label: string;
  readonly enabled: boolean;
  readonly reason?: FocusReason;
}

/** Only these kinds are gated by Alice's height; doors and NPCs are reachable at any size. */
const HEIGHT_GATED: ReadonlySet<InteractableKind> = new Set(["key"]);

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Distance along the ray to the sphere, or null if the ray misses it. */
function rayHitsSphere(origin: Vec3, dir: Vec3, center: Vec3, radius: number): number | null {
  const toCenter = sub(center, origin);
  const along = dot(toCenter, dir);
  if (along < 0) return null;
  const missSq = dot(toCenter, toCenter) - along * along;
  return missSq <= radius * radius ? along : null;
}

function inCone(toItem: Vec3, dir: Vec3, coneDegrees: number): boolean {
  const length = Math.hypot(...toItem);
  if (length === 0) return true;
  return dot(toItem, dir) / length >= Math.cos((coneDegrees * Math.PI) / 180);
}

function horizontalGap(viewer: Viewer, item: LevelInteractable): number {
  const dx = item.pos[0] - viewer.eye[0];
  const dz = item.pos[2] - viewer.eye[2];
  return Math.max(0, Math.hypot(dx, dz) - item.radius);
}

export function reasonFor(item: LevelInteractable, viewer: Viewer): FocusReason | undefined {
  if (!item.enabled) return "locked";
  if (HEIGHT_GATED.has(item.kind) && item.pos[1] - viewer.feetY > viewer.reachHeight + 1e-9) return "too-small";
  return undefined;
}

/** The nearest interactable the player is looking at and is within reach of, or null. */
export function pickFocus(
  items: readonly LevelInteractable[],
  viewer: Viewer,
  coneDegrees: number,
): Focus | null {
  let best: { item: LevelInteractable; distance: number } | null = null;
  for (const item of items) {
    if (horizontalGap(viewer, item) > viewer.reach) continue;
    const toItem = sub(item.pos, viewer.eye);
    const looking = rayHitsSphere(viewer.eye, viewer.dir, item.pos, item.radius) !== null || inCone(toItem, viewer.dir, coneDegrees);
    if (!looking) continue;
    const distance = Math.hypot(...toItem);
    if (!best || distance < best.distance) best = { item, distance };
  }
  if (!best) return null;
  const { item } = best;
  const reason = reasonFor(item, viewer);
  return { id: item.id, kind: item.kind, label: item.label, enabled: item.enabled, ...(reason ? { reason } : {}) };
}

/** Stable key for "did the focus change?" checks. */
export function focusKey(focus: Focus | null): string {
  return focus ? `${focus.id}|${focus.reason ?? ""}` : "";
}
