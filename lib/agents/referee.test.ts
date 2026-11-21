/**
 * File: lib/agents/referee.test.ts
 * Purpose: Tests that game rules hold no matter what the Referee model says.
 * Author: varenya
 * Date: 2026-11-21
 */
import { describe, expect, it } from "vitest";
import { CHESHIRE_RUBRIC } from "./personas/cheshire.rubric";
import { enforceVerdict, formatTranscript, NEUTRAL_VERDICT } from "./referee";

const base = { ...NEUTRAL_VERDICT };

describe("enforceVerdict", () => {
  it("never awards the key when the player fell for it (the bug seen live in Phase 2)", () => {
    const v = enforceVerdict(
      { ...base, outcome: "fell_for_it", sizeDelta: -20, keyEarned: true, levelComplete: true, lesson: "x" },
      CHESHIRE_RUBRIC,
    );
    expect(v).toMatchObject({ keyEarned: false, levelComplete: false, lesson: null, sizeDelta: -20 });
  });

  it("clamps size changes into the range for each outcome", () => {
    expect(enforceVerdict({ ...base, outcome: "resisted", sizeDelta: 99 }, CHESHIRE_RUBRIC).sizeDelta).toBe(20);
    expect(enforceVerdict({ ...base, outcome: "resisted", sizeDelta: -10 }, CHESHIRE_RUBRIC).sizeDelta).toBe(5);
    expect(enforceVerdict({ ...base, outcome: "fell_for_it", sizeDelta: 10 }, CHESHIRE_RUBRIC).sizeDelta).toBe(-15);
    expect(enforceVerdict({ ...base, outcome: "fell_for_it", sizeDelta: -90 }, CHESHIRE_RUBRIC).sizeDelta).toBe(-25);
    expect(enforceVerdict({ ...base, outcome: "neutral", sizeDelta: 12 }, CHESHIRE_RUBRIC).sizeDelta).toBe(0);
  });

  it("awards the key and keeps the lesson when resisted", () => {
    const v = enforceVerdict(
      { ...base, outcome: "resisted", sizeDelta: 15, keyEarned: true, lesson: " Check the address! " },
      CHESHIRE_RUBRIC,
    );
    expect(v).toMatchObject({ keyEarned: true, levelComplete: true, lesson: "Check the address!" });
  });

  it("uses the rubric's default lesson when the model gives none", () => {
    const v = enforceVerdict({ ...base, outcome: "resisted", sizeDelta: 15, keyEarned: true }, CHESHIRE_RUBRIC);
    expect(v.lesson).toBe(CHESHIRE_RUBRIC.defaultLesson);
  });

  it("drops lessons when the level isn't complete and trims red flags", () => {
    const v = enforceVerdict(
      { ...base, outcome: "resisted", sizeDelta: 8, lesson: "early", redFlagsNamed: [" a ", "", "b", "c", "d", "e"] },
      CHESHIRE_RUBRIC,
    );
    expect(v.lesson).toBeNull();
    expect(v.redFlagsNamed).toEqual(["a", "b", "c", "d"]);
  });
});

describe("formatTranscript", () => {
  it("labels speakers and marks the latest player message", () => {
    const text = formatTranscript(
      [
        { role: "npc", text: "Free crown?" },
        { role: "player", text: "maybe" },
        { role: "npc", text: "Hurry!" },
        { role: "player", text: "no, wrong address" },
      ],
      "Cheshire Cat",
    );
    expect(text).toContain("CHESHIRE CAT: Free crown?");
    expect(text).toContain("PLAYER: maybe");
    expect(text).toContain("PLAYER (LATEST): no, wrong address");
  });
});
