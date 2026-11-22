/**
 * File: lib/agents/personas/personas.test.ts
 * Purpose: Tests that all four trial characters are wired, safe to send to the client, and that
 *          the Hatter's rounds hold exactly one true claim each.
 * Author: manasa
 * Date: 2026-11-21
 */
import { describe, expect, it } from "vitest";
import { KEY_PIECES } from "../../constants";
import { describeAnswersForReferee, describeRoundsForNpc, HATTER_ROUNDS } from "./hatter.claims";
import { HATTER_PUBLIC, HATTER_ROUND_ONE_CLAIMS } from "./hatter.public";
import { getNpcLevel } from "./index";
import { NPC_PUBLIC } from "./public";
import { buildSystemPrompt } from "./shared";

describe("registry", () => {
  it("resolves every key piece to a persona and rubric with matching ids", () => {
    for (const piece of KEY_PIECES) {
      const level = getNpcLevel(piece);
      expect(level?.persona.id).toBe(piece);
      expect(level?.rubric.level).toBe(piece);
      expect(level?.rubric.examples.length).toBeGreaterThan(0);
    }
  });

  it("does not resolve unknown ids or prototype keys", () => {
    expect(getNpcLevel("trial")).toBeUndefined();
    expect(getNpcLevel("constructor")).toBeUndefined();
  });
});

describe("public data", () => {
  it("never carries hidden goals to the client", () => {
    for (const piece of KEY_PIECES) {
      const hiddenGoal = getNpcLevel(piece)?.persona.hiddenGoal ?? "";
      expect(NPC_PUBLIC[piece].openingLine).not.toContain(hiddenGoal);
      expect(Object.keys(NPC_PUBLIC[piece]).sort()).toEqual(["displayName", "openingLine"]);
    }
  });
});

describe("Hatter claims", () => {
  it("has exactly one true claim among four in every round", () => {
    expect(HATTER_ROUNDS.length).toBe(3);
    for (const round of HATTER_ROUNDS) {
      expect(round).toHaveLength(4);
      expect(round.filter((claim) => claim.isTrue)).toHaveLength(1);
    }
  });

  it("puts the true claim in different positions so it is not guessable", () => {
    const positions = HATTER_ROUNDS.map((round) => round.findIndex((claim) => claim.isTrue));
    expect(new Set(positions).size).toBeGreaterThan(1);
  });

  it("shows round-one claims in the public opening line, matching the server data", () => {
    const roundOne = HATTER_ROUNDS[0]?.map((claim) => claim.text);
    expect([...HATTER_ROUND_ONE_CLAIMS]).toEqual(roundOne);
    for (const claim of HATTER_ROUND_ONE_CLAIMS) expect(HATTER_PUBLIC.openingLine).toContain(claim);
  });

  it("keeps the answer key out of the NPC's prompt but gives it to the Referee", () => {
    expect(describeRoundsForNpc()).not.toMatch(/TRUE claim/);
    expect(describeAnswersForReferee()).toContain("Honey never really goes bad");
    const hatter = getNpcLevel("hatter");
    expect(hatter && buildSystemPrompt(hatter.persona)).not.toContain("TRUE claim");
    expect(hatter?.rubric.resisted).toContain("TRUE claim");
  });
});

describe("buildSystemPrompt", () => {
  it("adds a format override only for personas that define one", () => {
    expect(buildSystemPrompt(getNpcLevel("hatter")!.persona)).toContain("FORMAT OVERRIDE");
    expect(buildSystemPrompt(getNpcLevel("queen")!.persona)).not.toContain("FORMAT OVERRIDE");
  });
});
