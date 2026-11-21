/**
 * File: lib/llm.test.ts
 * Purpose: Tests for structured output (success, retry, fallback) and streamed
 *          text, using the AI SDK mock model (no network).
 * Author: varenya
 * Date: 2026-11-21
 */
import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { generateStructured, streamLine, STRUCTURED_ATTEMPTS } from "./llm";
import { RefereeVerdict, RefereeVerdictWire, type RefereeVerdictType } from "./schemas";

const USAGE = {
  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 20, text: 20, reasoning: undefined },
};

const GOOD: RefereeVerdictType = {
  outcome: "resisted",
  sizeDelta: 10,
  redFlagsNamed: ["odd web address"],
  keyEarned: true,
  levelComplete: true,
  lesson: "Check the address before you click.",
  oversharedRealInfo: false,
};

const FALLBACK: RefereeVerdictType = { ...GOOD, outcome: "neutral", sizeDelta: 0, keyEarned: false, levelComplete: false, lesson: null };

/** A mock model that answers each call with the next JSON text (or throws). */
function jsonModel(replies: readonly (unknown | Error)[]) {
  let call = 0;
  const model = new MockLanguageModelV4({
    doGenerate: async () => {
      const reply = replies[Math.min(call++, replies.length - 1)];
      if (reply instanceof Error) throw reply;
      return {
        content: [{ type: "text", text: JSON.stringify(reply) }],
        finishReason: { unified: "stop", raw: undefined },
        usage: USAGE,
        warnings: [],
      };
    },
  });
  return { model, calls: () => call };
}

function run(model: MockLanguageModelV4) {
  return generateStructured({
    model,
    system: "referee",
    messages: [{ role: "user", content: "PLAYER: no thanks" }],
    wireSchema: RefereeVerdictWire,
    schema: RefereeVerdict,
    fallback: FALLBACK,
  });
}

describe("generateStructured", () => {
  it("returns the parsed value on the first good answer", async () => {
    const { model, calls } = jsonModel([GOOD]);
    const result = await run(model);
    expect(result).toEqual({ value: GOOD, usedFallback: false, attempts: 1 });
    expect(calls()).toBe(1);
  });

  it("retries once when the answer breaks a game rule the wire schema allows", async () => {
    const { model, calls } = jsonModel([{ ...GOOD, sizeDelta: 999 }, GOOD]);
    const result = await run(model);
    expect(result.value).toEqual(GOOD);
    expect(result.attempts).toBe(2);
    expect(calls()).toBe(2);
  });

  it("retries once when the API call throws", async () => {
    const { model } = jsonModel([new Error("429 rate limited"), GOOD]);
    const result = await run(model);
    expect(result).toMatchObject({ value: GOOD, usedFallback: false, attempts: 2 });
  });

  it("returns the fallback after every attempt fails, without throwing", async () => {
    const { model, calls } = jsonModel([{ not: "a verdict" }]);
    const result = await run(model);
    expect(result).toEqual({ value: FALLBACK, usedFallback: true, attempts: STRUCTURED_ATTEMPTS });
    expect(calls()).toBe(STRUCTURED_ATTEMPTS);
  });
});

describe("streamLine", () => {
  it("yields text deltas in order", async () => {
    const model = new MockLanguageModelV4({
      doStream: async () => ({
        stream: simulateReadableStream({
          chunks: [
            { type: "text-start", id: "t" },
            { type: "text-delta", id: "t", delta: "We're all " },
            { type: "text-delta", id: "t", delta: "mad here." },
            { type: "text-end", id: "t" },
            { type: "finish", finishReason: { unified: "stop", raw: undefined }, usage: USAGE },
          ],
        }),
      }),
    });
    const parts: string[] = [];
    for await (const delta of streamLine({ model, system: "cat", messages: [{ role: "user", content: "hi" }] })) {
      parts.push(delta);
    }
    expect(parts.join("")).toBe("We're all mad here.");
  });
});
