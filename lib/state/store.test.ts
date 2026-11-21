/**
 * File: lib/state/store.test.ts
 * Purpose: Tests for game store actions (happy, edge, and failure cases).
 * Author: manasa
 * Date: 2026-11-21
 */
import { beforeEach, describe, expect, it } from "vitest";
import { REWINDS_PER_LEVEL, SIZE_MAX, SIZE_MIN, SIZE_START } from "../constants";
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

  it("consumes rewinds and refuses when none are left", () => {
    for (let i = 0; i < REWINDS_PER_LEVEL; i += 1) {
      expect(useGameStore.getState().useRewind("cheshire")).toBe(true);
    }
    expect(useGameStore.getState().useRewind("cheshire")).toBe(false);
    expect(useGameStore.getState().rewindsLeft.cheshire).toBe(0);
  });
});
