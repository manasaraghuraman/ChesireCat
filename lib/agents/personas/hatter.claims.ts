/**
 * File: lib/agents/personas/hatter.claims.ts
 * Purpose: Misinformation rounds for the Mad Hatter (spec §7.2): 4 claims per round, exactly one
 *          true, all cited to the fake "Tea Times". Server-only: it holds the answers.
 * Author: manasa
 * Date: 2026-11-21
 */
export interface Claim {
  readonly text: string;
  readonly isTrue: boolean;
}

export const HATTER_ROUNDS: readonly (readonly Claim[])[] = [
  [
    { text: "Goldfish only remember things for three seconds.", isTrue: false },
    { text: "We only use ten percent of our brains.", isTrue: false },
    { text: "Honey never really goes bad if it stays sealed.", isTrue: true },
    { text: "Bats are completely blind.", isTrue: false },
  ],
  [
    { text: "Lightning never strikes the same place twice.", isTrue: false },
    { text: "Octopuses have three hearts.", isTrue: true },
    { text: "Sugar makes children hyperactive.", isTrue: false },
    { text: "The Great Wall of China is easily visible from the moon.", isTrue: false },
  ],
  [
    { text: "Shaving makes hair grow back thicker.", isTrue: false },
    { text: "Dogs only see in black and white.", isTrue: false },
    { text: "Hair and fingernails keep growing after death.", isTrue: false },
    { text: "Bananas are berries, but strawberries are not.", isTrue: true },
  ],
];

export function describeRoundsForNpc(): string {
  return HATTER_ROUNDS.map(
    (round, index) => `Round ${index + 1}: ` + round.map((claim, position) => `(${position + 1}) ${claim.text}`).join(" "),
  ).join("\n");
}

export function describeAnswersForReferee(): string {
  return HATTER_ROUNDS.map((round, index) => {
    const position = round.findIndex((claim) => claim.isTrue) + 1;
    return `Round ${index + 1}: the TRUE claim is (${position}) ${round[position - 1]?.text ?? ""}`;
  }).join("\n");
}
