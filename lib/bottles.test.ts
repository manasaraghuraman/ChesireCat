/**
 * File: lib/bottles.test.ts
 * Purpose: Tests for the Drink Me bottles: inspecting is rewarded, bad downloads are harmless.
 * Author: manasa
 * Date: 2026-11-21
 */
import { describe, expect, it } from "vitest";
import {
  BOTTLES,
  BOTTLE_BAD_USED_PENALTY,
  BOTTLE_INSPECT_BONUS,
  BOTTLE_SAFE_USED_REWARD,
  resolveBottle,
  type Bottle,
} from "./bottles";

const safe = BOTTLES.find((bottle) => bottle.isSafe) as Bottle;
const unsafe = BOTTLES.find((bottle) => !bottle.isSafe) as Bottle;

describe("BOTTLES", () => {
  it("mixes safe and unsafe items with unique ids", () => {
    expect(new Set(BOTTLES.map((b) => b.id)).size).toBe(BOTTLES.length);
    expect(BOTTLES.some((b) => b.isSafe)).toBe(true);
    expect(BOTTLES.some((b) => !b.isSafe)).toBe(true);
  });
});

describe("resolveBottle", () => {
  it("using a bad bottle shrinks Alice and shows the pretend locked screen", () => {
    const outcome = resolveBottle(unsafe, { hasInspected: true, isUsing: true });
    expect(outcome).toMatchObject({ sizeDelta: BOTTLE_BAD_USED_PENALTY, isLockedScreen: true });
  });

  it("using a safe bottle is rewarded, with a bonus for inspecting first", () => {
    expect(resolveBottle(safe, { hasInspected: false, isUsing: true }).sizeDelta).toBe(BOTTLE_SAFE_USED_REWARD);
    expect(resolveBottle(safe, { hasInspected: true, isUsing: true }).sizeDelta).toBe(
      BOTTLE_SAFE_USED_REWARD + BOTTLE_INSPECT_BONUS,
    );
  });

  it("leaving a bad bottle is a good call; leaving a safe one costs nothing", () => {
    expect(resolveBottle(unsafe, { hasInspected: true, isUsing: false }).sizeDelta).toBeGreaterThan(0);
    expect(resolveBottle(safe, { hasInspected: true, isUsing: false }).sizeDelta).toBe(0);
  });
});
