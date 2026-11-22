/**
 * File: game3d/sizing.test.ts
 * Purpose: Tests for size → body scaling and the interaction picker.
 * Date: 2026-11-21
 */
import { describe, expect, it } from "vitest";
import { SIZE_MAX, SIZE_MIN, SIZE_START, SIZE_TOO_SMALL } from "../lib/constants";
import { INTERACT, SIZE_SCALING } from "./config";
import { focusKey, pickFocus, type Viewer } from "./interact";
import type { LevelInteractable } from "./level";
import { bodyForSize, KEY_HEIGHT, sizeRatio } from "./sizing";

describe("sizing", () => {
  it("is ratio 1 at the starting size", () => {
    expect(sizeRatio(SIZE_START)).toBe(1);
    const body = bodyForSize(SIZE_START);
    expect(body.eyeHeight).toBe(SIZE_SCALING.baseEyeHeight);
    expect(body.reach).toBe(SIZE_SCALING.baseReach);
    expect(body.speedScale).toBe(1);
  });

  it("clamps at 0 and 100", () => {
    expect(sizeRatio(SIZE_MIN)).toBe(SIZE_SCALING.minRatio);
    expect(sizeRatio(SIZE_MAX)).toBe(SIZE_SCALING.maxRatio);
    expect(sizeRatio(Number.NaN)).toBe(1);
  });

  it("makes small Alice shorter, slower and shorter-reaching", () => {
    const small = bodyForSize(30);
    const normal = bodyForSize(SIZE_START);
    expect(small.eyeHeight).toBeLessThan(normal.eyeHeight);
    expect(small.reach).toBeLessThan(normal.reach);
    expect(small.speedScale).toBeLessThan(1);
    expect(small.speedScale).toBeCloseTo(Math.sqrt(0.5));
    expect(small.colliderRadius * 2).toBeLessThan(small.colliderHeight);
  });

  it("can't reach the key at size 24 but can at size 25", () => {
    expect(bodyForSize(SIZE_TOO_SMALL - 1).reachHeight).toBeLessThan(KEY_HEIGHT);
    expect(bodyForSize(SIZE_TOO_SMALL).reachHeight).toBeGreaterThanOrEqual(KEY_HEIGHT);
  });
});

const item = (over: Partial<LevelInteractable> = {}): LevelInteractable => ({
  id: "door",
  kind: "door",
  pos: [0, 1.5, -2],
  radius: 0.5,
  label: "Door",
  enabled: true,
  ...over,
});

function viewerAt(size: number, dir: [number, number, number] = [0, 0, -1]): Viewer {
  const body = bodyForSize(size);
  const len = Math.hypot(...dir);
  return {
    eye: [0, body.eyeHeight, 0],
    dir: [dir[0] / len, dir[1] / len, dir[2] / len],
    feetY: 0,
    reach: body.reach,
    reachHeight: body.reachHeight,
  };
}

describe("pickFocus", () => {
  it("focuses what the ray hits within reach", () => {
    expect(pickFocus([item()], viewerAt(SIZE_START), INTERACT.coneDegrees)?.id).toBe("door");
  });

  it("ignores things out of reach or behind you", () => {
    expect(pickFocus([item({ pos: [0, 1.5, -6] })], viewerAt(SIZE_START), INTERACT.coneDegrees)).toBeNull();
    expect(pickFocus([item({ pos: [0, 1.5, 2] })], viewerAt(SIZE_START), INTERACT.coneDegrees)).toBeNull();
  });

  it("accepts a near miss inside the cone but not outside it", () => {
    const thin = item({ radius: 0.01, pos: [0.25, 1.6, -2] }); // ~7° off-axis
    expect(pickFocus([thin], viewerAt(SIZE_START), INTERACT.coneDegrees)?.id).toBe("door");
    const wide = item({ radius: 0.01, pos: [1.2, 1.6, -1.6] }); // ~37° off-axis
    expect(pickFocus([wide], viewerAt(SIZE_START), INTERACT.coneDegrees)).toBeNull();
  });

  it("picks the nearest of several", () => {
    const near = item({ id: "near", pos: [0, 1.6, -1] });
    const far = item({ id: "far", pos: [0, 1.6, -2] });
    expect(pickFocus([far, near], viewerAt(SIZE_START), INTERACT.coneDegrees)?.id).toBe("near");
  });

  it("reports disabled things as locked", () => {
    const focus = pickFocus([item({ enabled: false })], viewerAt(SIZE_START), INTERACT.coneDegrees);
    expect(focus).toMatchObject({ enabled: false, reason: "locked" });
  });

  it("says too-small for the key below SIZE_TOO_SMALL only", () => {
    const key = item({ id: "key", kind: "key", pos: [0, KEY_HEIGHT, -0.6], radius: 0.3 });
    const lookAtKey = (size: number) => {
      const eyeY = bodyForSize(size).eyeHeight;
      return viewerAt(size, [0, KEY_HEIGHT - eyeY, -0.6]);
    };
    expect(pickFocus([key], lookAtKey(SIZE_TOO_SMALL - 1), INTERACT.coneDegrees)?.reason).toBe("too-small");
    expect(pickFocus([key], lookAtKey(SIZE_TOO_SMALL), INTERACT.coneDegrees)?.reason).toBeUndefined();
  });

  it("never height-gates doors", () => {
    const tallDoor = item({ pos: [0, 2.5, -0.5] });
    expect(pickFocus([tallDoor], viewerAt(SIZE_MIN, [0, 2, -0.5]), INTERACT.coneDegrees)?.reason).toBeUndefined();
  });

  it("has a stable change key", () => {
    expect(focusKey(null)).toBe("");
    expect(focusKey({ id: "a", kind: "door", label: "A", enabled: false, reason: "locked" })).toBe("a|locked");
  });
});
