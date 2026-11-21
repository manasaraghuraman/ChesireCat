/**
 * File: lib/state/store.test.ts
 * Purpose: Tests for game store actions (happy, edge, and failure cases).
 * Author: manasa
 * Date: 2026-11-21
 */
import { beforeEach, describe, expect, it } from "vitest";
import { REWINDS_PER_LEVEL, SIZE_MAX, SIZE_MIN, SIZE_START, SIZE_TOO_SMALL } from "../constants";
import { useGameStore } from "./store";

describe("game store", () => {
  beforeEach(() => useGameStore.getState().reset());

  it("starts at the initial size with no keys", () => {
    const s = useGameStore.getState();
    expect(s.size).toBe(SIZE_START);
    expect(s.keys).toEqual([]);
  });

  it("clamps size to the allowed range", () => {
    useGameStore.getState().changeSize(1000);
    expect(useGameStore.getState().size).toBe(SIZE_MAX);
    useGameStore.getState().changeSize(-1000);
    expect(useGameStore.getState().size).toBe(SIZE_MIN);
  });

  it("awards each key piece only once", () => {
    useGameStore.getState().awardKey("cheshire");
    useGameStore.getState().awardKey("cheshire");
    expect(useGameStore.getState().keys).toEqual(["cheshire"]);
  });

  it("applies a winning verdict: grows, awards the key once, records the lesson", () => {
    const verdict = {
      outcome: "resisted" as const,
      sizeDelta: 15,
      redFlagsNamed: ["wrong address"],
      keyEarned: true,
      levelComplete: true,
      lesson: "Check the address.",
      oversharedRealInfo: false,
    };
    const outcome = useGameStore.getState().applyVerdict("cheshire", verdict);
    expect(outcome).toEqual({ sizeBefore: SIZE_START, sizeAfter: SIZE_START + 15, keyAwarded: true, tooSmallForKey: false });
    expect(useGameStore.getState().keys).toEqual(["cheshire"]);
    expect(useGameStore.getState().lessons).toEqual(["Check the address."]);
    expect(useGameStore.getState().applyVerdict("cheshire", verdict).keyAwarded).toBe(false);
  });

  it("withholds the key when Alice is too small to reach it", () => {
    useGameStore.getState().changeSize(-(SIZE_START - SIZE_TOO_SMALL) - 10);
    const outcome = useGameStore.getState().applyVerdict("cheshire", {
      outcome: "resisted",
      sizeDelta: 5,
      redFlagsNamed: [],
      keyEarned: true,
      levelComplete: true,
      lesson: "x",
      oversharedRealInfo: false,
    });
    expect(outcome).toMatchObject({ keyAwarded: false, tooSmallForKey: true });
    expect(useGameStore.getState().keys).toEqual([]);
  });

  it("consumes rewinds and refuses when none are left", () => {
    for (let i = 0; i < REWINDS_PER_LEVEL; i += 1) {
      expect(useGameStore.getState().useRewind("cheshire")).toBe(true);
    }
    expect(useGameStore.getState().useRewind("cheshire")).toBe(false);
    expect(useGameStore.getState().rewindsLeft.cheshire).toBe(0);
  });
});
