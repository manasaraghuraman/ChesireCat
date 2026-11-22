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
    useGameStore.setState({ rabbitCured: true }); // the Cheshire piece also needs the Rabbit cured
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
    expect(outcome).toEqual({
      sizeBefore: SIZE_START,
      sizeAfter: SIZE_START + 15,
      keyAwarded: true,
      tooSmallForKey: false,
      heldForRabbit: false,
    });
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

  const WIN = {
    outcome: "resisted" as const,
    sizeDelta: 15,
    redFlagsNamed: ["wrong address"],
    keyEarned: true,
    levelComplete: true,
    lesson: "Check the address.",
    oversharedRealInfo: false,
  };

  it("holds the Cheshire key until the Rabbit is cured, then awards it once", () => {
    const outcome = useGameStore.getState().applyVerdict("cheshire", WIN);
    expect(outcome).toMatchObject({ keyAwarded: false, heldForRabbit: true });
    expect(useGameStore.getState().keys).toEqual([]);
    expect(useGameStore.getState().cureRabbit()).toEqual({ keyAwarded: true, piece: "cheshire", lesson: "Check the address." });
    expect(useGameStore.getState()).toMatchObject({ rabbitCured: true, keys: ["cheshire"], lessons: ["Check the address."] });
    expect(useGameStore.getState().cureRabbit().keyAwarded).toBe(false);
  });

  it("curing with nothing held just marks the Rabbit cured; later wins award directly", () => {
    expect(useGameStore.getState().cureRabbit()).toEqual({ keyAwarded: false, piece: null, lesson: null });
    expect(useGameStore.getState().applyVerdict("cheshire", WIN)).toMatchObject({ keyAwarded: true, heldForRabbit: false });
  });

  it("doesn't award a held key if Alice shrank below reach before the cure", () => {
    useGameStore.getState().applyVerdict("cheshire", WIN);
    useGameStore.getState().changeSize(-100);
    expect(useGameStore.getState().cureRabbit().keyAwarded).toBe(false);
    expect(useGameStore.getState().keys).toEqual([]);
  });

  it("rewinds the size from before the last choice, spending a rewind", () => {
    expect(useGameStore.getState().rewind("cheshire")).toBe(false); // nothing to undo yet
    useGameStore.getState().applyVerdict("cheshire", { ...WIN, outcome: "fell_for_it", sizeDelta: -20, keyEarned: false });
    expect(useGameStore.getState().size).toBe(SIZE_START - 20);
    expect(useGameStore.getState().rewind("cheshire")).toBe(true);
    expect(useGameStore.getState().size).toBe(SIZE_START);
    expect(useGameStore.getState().rewindsLeft.cheshire).toBe(REWINDS_PER_LEVEL - 1);
    expect(useGameStore.getState().rewind("cheshire")).toBe(false); // one undo per choice
  });
});
