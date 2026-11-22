/**
 * File: lib/client/rabbitState.test.ts
 * Purpose: Tests for the reducer that folds Rabbit SSE events into panel state.
 * Author: manasa
 * Date: 2026-11-21
 */
import { describe, expect, it } from "vitest";
import { INITIAL_RABBIT_VIEW, rabbitReducer } from "./rabbitState";

describe("rabbitReducer", () => {
  it("concatenates narration deltas in order", () => {
    const state = [{ type: "narration", text: "The address " }, { type: "narration", text: "is odd." }].reduce(
      (current, event) => rabbitReducer(current, event as never),
      INITIAL_RABBIT_VIEW,
    );
    expect(state.narration).toBe("The address is odd.");
  });

  it("stores the screenshot with the pretend address, the verdict and the replay", () => {
    let state = rabbitReducer(INITIAL_RABBIT_VIEW, { type: "screenshot", pngBase64: "abc", url: "x.wonder" });
    state = rabbitReducer(state, { type: "verdict", safe: true, reasons: ["r"] });
    state = rabbitReducer(state, { type: "replay", replayUrl: "https://replay" });
    expect(state.screenshot).toEqual({ pngBase64: "abc", address: "x.wonder" });
    expect(state.verdict).toEqual({ safe: true, reasons: ["r"] });
    expect(state.replayUrl).toBe("https://replay");
  });

  it("reset clears everything", () => {
    const filled = rabbitReducer(INITIAL_RABBIT_VIEW, { type: "narration", text: "hi" });
    expect(rabbitReducer(filled, { type: "reset" })).toEqual(INITIAL_RABBIT_VIEW);
  });
});
