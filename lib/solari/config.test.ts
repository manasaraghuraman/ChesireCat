/**
 * File: lib/solari/config.test.ts
 * Purpose: Tests for Solari env validation.
 * Author: manasa
 * Date: 2026-11-21
 */
import { describe, expect, it } from "vitest";
import { getSolariConfig, TTL_DEFAULT_SECONDS } from "./config";

const KEY = "slr_live_test";

describe("getSolariConfig", () => {
  it("accepts a valid key and defaults the TTL", () => {
    const result = getSolariConfig({ SOLARI_API_KEY: KEY });
    expect(result).toEqual({ isOk: true, value: { apiKey: KEY, ttlSeconds: TTL_DEFAULT_SECONDS } });
  });

  it("reads a custom TTL", () => {
    const env = { SOLARI_API_KEY: KEY, SOLARI_SESSION_TTL_SECONDS: "120" };
    const result = getSolariConfig(env);
    expect(result.isOk && result.value.ttlSeconds).toBe(120);
  });

  it.each([
    [{}],
    [{ SOLARI_API_KEY: "wrong" }],
    [{ SOLARI_API_KEY: KEY, SOLARI_SESSION_TTL_SECONDS: "5" }],
    [{ SOLARI_API_KEY: KEY, SOLARI_SESSION_TTL_SECONDS: "999999" }],
  ])("rejects bad config %#", (env) => {
    const result = getSolariConfig(env);
    expect(result.isOk).toBe(false);
  });

  it("never echoes the key in the error", () => {
    const result = getSolariConfig({ SOLARI_API_KEY: "secret-value" });
    expect(JSON.stringify(result)).not.toContain("secret-value");
  });
});
