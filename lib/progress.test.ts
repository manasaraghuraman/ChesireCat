/**
 * File: lib/progress.test.ts
 * Purpose: Tests for which key pieces the Trial needs.
 * Author: manasa
 * Date: 2026-11-21
 */
import { describe, expect, it } from "vitest";
import { hasRequiredKeys, requiredKeys } from "./progress";

describe("requiredKeys", () => {
  it("is only the Cheshire key in demo mode", () => {
    expect(requiredKeys(true)).toEqual(["cheshire"]);
  });
  it("is all four keys otherwise", () => {
    expect(requiredKeys(false)).toHaveLength(4);
  });
});

describe("hasRequiredKeys", () => {
  it("demo: Cheshire alone opens the garden door", () => {
    expect(hasRequiredKeys(["cheshire"], true)).toBe(true);
    expect(hasRequiredKeys(["queen"], true)).toBe(false);
    expect(hasRequiredKeys([], true)).toBe(false);
  });
  it("full game: needs every piece", () => {
    expect(hasRequiredKeys(["cheshire", "queen", "hatter"], false)).toBe(false);
    expect(hasRequiredKeys(["cheshire", "queen", "hatter", "caterpillar"], false)).toBe(true);
  });
});
