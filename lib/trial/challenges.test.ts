/**
 * File: lib/trial/challenges.test.ts
 * Purpose: Tests for the Trial rapid-fire round: data shape, scoring and the pass mark.
 * Author: manasa
 * Date: 2026-11-21
 */
import { describe, expect, it } from "vitest";
import {
  answerChallenge,
  hasPassedRound,
  TRIAL_CHALLENGES,
  TRIAL_PASS_MARK,
  TRIAL_SIZE_CORRECT,
  TRIAL_SIZE_WRONG,
} from "./challenges";

describe("TRIAL_CHALLENGES", () => {
  it("covers all four threat types with a valid correct answer", () => {
    expect(new Set(TRIAL_CHALLENGES.map((c) => c.threat)).size).toBe(4);
    for (const challenge of TRIAL_CHALLENGES) {
      expect(challenge.correctIndex).toBeGreaterThanOrEqual(0);
      expect(challenge.correctIndex).toBeLessThan(challenge.options.length);
    }
  });

  it("is passable: the pass mark never exceeds the number of challenges", () => {
    expect(TRIAL_PASS_MARK).toBeLessThanOrEqual(TRIAL_CHALLENGES.length);
  });
});

describe("answerChallenge", () => {
  const [challenge] = TRIAL_CHALLENGES;
  if (!challenge) throw new Error("no challenges");

  it("rewards the correct choice", () => {
    expect(answerChallenge(challenge, challenge.correctIndex)).toEqual({ isCorrect: true, sizeDelta: TRIAL_SIZE_CORRECT });
  });

  it("penalises a wrong choice and treats out-of-range as wrong", () => {
    const wrong = (challenge.correctIndex + 1) % challenge.options.length;
    expect(answerChallenge(challenge, wrong)).toEqual({ isCorrect: false, sizeDelta: TRIAL_SIZE_WRONG });
    expect(answerChallenge(challenge, 99).isCorrect).toBe(false);
    expect(answerChallenge(challenge, -1).isCorrect).toBe(false);
  });
});

describe("hasPassedRound", () => {
  it("passes at the mark and above, fails below", () => {
    expect(hasPassedRound(TRIAL_PASS_MARK)).toBe(true);
    expect(hasPassedRound(TRIAL_PASS_MARK - 1)).toBe(false);
  });
});
