/**
 * File: lib/schemas.test.ts
 * Purpose: Tests for the contracts added in phases 5-12 and for save-file compatibility.
 * Author: manasa
 * Date: 2026-11-21
 */
import { describe, expect, it } from "vitest";
import { createInitialState } from "./state/store";
import {
  CureBody,
  GameState,
  LinkCheckBody,
  LinkVerdict,
  RabbitBody,
  RabbitEvent,
  RabbitVerdict,
  ScamBody,
  SessionBody,
} from "./schemas";

const SESSION = "123e4567-e89b-12d3-a456-426614174000";

describe("GameState", () => {
  it("accepts an older save without hasWon and defaults it to false", () => {
    const { hasWon: _omitted, ...oldSave } = createInitialState();
    const parsed = GameState.safeParse(oldSave);
    expect(parsed.success && parsed.data.hasWon).toBe(false);
  });
});

describe("request bodies", () => {
  it("require a uuid session id", () => {
    expect(SessionBody.safeParse({ sessionId: SESSION }).success).toBe(true);
    expect(SessionBody.safeParse({ sessionId: "abc" }).success).toBe(false);
  });

  it("only allow known WonderWeb pages for the Rabbit (no model- or client-chosen URLs)", () => {
    expect(RabbitBody.safeParse({ sessionId: SESSION, page: "free-crown" }).success).toBe(true);
    expect(RabbitBody.safeParse({ sessionId: SESSION, page: "https://evil.example" }).success).toBe(false);
  });

  it("limit message and url lengths", () => {
    expect(CureBody.safeParse({ sessionId: SESSION, message: "x".repeat(401) }).success).toBe(false);
    expect(ScamBody.safeParse({ message: "   " }).success).toBe(false);
    expect(LinkCheckBody.safeParse({ url: "h".repeat(2049) }).success).toBe(false);
  });
});

describe("model output contracts", () => {
  it("RabbitEvent rejects unknown event types", () => {
    expect(RabbitEvent.safeParse({ type: "narration", text: "hi" }).success).toBe(true);
    expect(RabbitEvent.safeParse({ type: "boom" }).success).toBe(false);
  });

  it("RabbitVerdict and LinkVerdict need 1-4 reasons", () => {
    expect(RabbitVerdict.safeParse({ safe: true, reasons: [] }).success).toBe(false);
    expect(RabbitVerdict.safeParse({ safe: true, reasons: ["a", "b", "c", "d", "e"] }).success).toBe(false);
    const link = { finalUrl: "https://x", verdict: "suspicious", checkNext: "n", screenshotPngBase64: "" };
    expect(LinkVerdict.safeParse({ ...link, reasons: ["a"] }).success).toBe(true);
    expect(LinkVerdict.safeParse({ ...link, reasons: [] }).success).toBe(false);
  });
});
