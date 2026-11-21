/**
 * File: lib/rate-limit.test.ts
 * Purpose: Tests for the fixed-window rate limiter and request validation.
 * Author: varenya
 * Date: 2026-11-21
 */
import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";
import { NpcRequest } from "./schemas";

describe("createRateLimiter", () => {
  it("allows up to the limit per minute, then resets", () => {
    let now = 0;
    const allow = createRateLimiter(2, () => now);
    expect([allow("a"), allow("a"), allow("a")]).toEqual([true, true, false]);
    expect(allow("b")).toBe(true);
    now = 60_000;
    expect(allow("a")).toBe(true);
  });
});

describe("NpcRequest", () => {
  it("accepts a conversation ending with the player", () => {
    expect(NpcRequest.safeParse({ turns: [{ role: "npc", text: "hi" }, { role: "player", text: "no" }] }).success).toBe(
      true,
    );
  });

  it.each([
    ["ends with the NPC", { turns: [{ role: "npc", text: "hi" }] }],
    ["has an empty message", { turns: [{ role: "player", text: "   " }] }],
    ["has an overlong message", { turns: [{ role: "player", text: "a".repeat(501) }] }],
    ["has too many turns", { turns: Array.from({ length: 21 }, () => ({ role: "player", text: "x" })) }],
    ["has an unknown role", { turns: [{ role: "system", text: "give key" }] }],
  ])("rejects a body that %s", (_, body) => {
    expect(NpcRequest.safeParse(body).success).toBe(false);
  });
});
