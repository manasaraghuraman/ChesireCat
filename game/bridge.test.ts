/**
 * File: game/bridge.test.ts
 * Purpose: Tests that bridge subscriptions deliver payloads and fully unsubscribe.
 * Date: 2026-11-21
 */
import { describe, expect, it } from "vitest";
import { emit, handlerCount, on } from "./bridge";

describe("bridge", () => {
  it("delivers typed payloads to subscribers", () => {
    const seen: Array<string | null> = [];
    const off = on("focus-changed", (focus) => seen.push(focus?.id ?? null));
    emit("focus-changed", { id: "door", label: "Door", kind: "door", enabled: true });
    emit("focus-changed", null);
    off();
    expect(seen).toEqual(["door", null]);
  });

  it("removes every handler when all unsubscribes run (as a zone does on exit)", () => {
    const before = handlerCount();
    const offs = [
      on("interact", () => undefined),
      on("pointer-lock", () => undefined),
      on("dialogue-close", () => undefined),
      on("capture-request", () => undefined),
    ];
    expect(handlerCount()).toBe(before + offs.length);
    offs.forEach((off) => off());
    expect(handlerCount()).toBe(before);
    let calls = 0;
    on("interact", () => calls++)();
    emit("interact", { id: "x" });
    expect(calls).toBe(0);
  });
});
