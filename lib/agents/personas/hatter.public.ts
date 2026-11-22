/**
 * File: lib/agents/personas/hatter.public.ts
 * Purpose: Client-safe Mad Hatter data. Round-1 claims are shown to the player; which one is true
 *          lives only in hatter.claims.ts (server-only) so players can't read the answer.
 * Author: manasa
 * Date: 2026-11-21
 */
export const HATTER_ROUND_ONE_CLAIMS = [
  "Goldfish only remember things for three seconds.",
  "We only use ten percent of our brains.",
  "Honey never really goes bad if it stays sealed.",
  "Bats are completely blind.",
] as const;

export const HATTER_PUBLIC = {
  displayName: "Mad Hatter",
  openingLine:
    "Tea time! Tea time! Round ONE, and The Tea Times says so: " +
    HATTER_ROUND_ONE_CLAIMS.map((claim, index) => `(${index + 1}) ${claim}`).join(" ") +
    " Only one is true, my dear. Which, and WHY?",
} as const;
