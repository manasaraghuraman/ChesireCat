/**
 * File: lib/agents/npc.test.ts
 * Purpose: Tests for the NPC refusal guard and message mapping.
 * Author: varenya
 * Date: 2026-11-21
 */
import { describe, expect, it } from "vitest";
import { NPC_CONTEXT_TURNS } from "../constants";
import { guardRefusal, isRefusal, REFUSAL_PEEK_CHARS, toModelMessages } from "./npc";

async function* chunks(parts: readonly string[], failAfter?: number): AsyncGenerator<string> {
  for (const [index, part] of parts.entries()) {
    if (failAfter !== undefined && index >= failAfter) throw new Error("stream died");
    yield part;
  }
}

async function collect(source: AsyncIterable<string>): Promise<string[]> {
  const out: string[] = [];
  for await (const part of source) out.push(part);
  return out;
}

const FALLBACK = "*grin* Where was I?";

describe("isRefusal", () => {
  it.each(["I’m sorry, but I can’t help with that.", "I'm sorry...", "Sorry, but no", "I can't assist with that", "As an AI, I"])(
    "flags %s",
    (text) => expect(isRefusal(text)).toBe(true),
  );
  it.each(["We're all mad here!", "*grin* Sorry to keep you waiting, a crown awaits"])("allows %s", (text) =>
    expect(isRefusal(text)).toBe(false),
  );
});

describe("guardRefusal", () => {
  it("replaces a streamed refusal with the fallback (the bug seen live in Phase 2)", async () => {
    const parts = ["I", "’m", " sorry", ",", " but", " I", " can", "’t", " help", " with", " that", "."];
    expect(await collect(guardRefusal(chunks(parts), () => FALLBACK))).toEqual([FALLBACK]);
  });

  it("passes a normal reply through unchanged after the peek", async () => {
    const long = "x".repeat(REFUSAL_PEEK_CHARS);
    const out = await collect(guardRefusal(chunks(["We're ", "all mad. ", long, " more"]), () => FALLBACK));
    expect(out.join("")).toBe(`We're all mad. ${long} more`);
    expect(out.at(-1)).toBe(" more");
  });

  it("returns a short normal reply in one piece", async () => {
    expect(await collect(guardRefusal(chunks(["Hello", " there!"]), () => FALLBACK))).toEqual(["Hello there!"]);
  });

  it("uses the fallback for an empty reply or an early failure", async () => {
    expect(await collect(guardRefusal(chunks([]), () => FALLBACK))).toEqual([FALLBACK]);
    expect(await collect(guardRefusal(chunks(["Hel", "lo"], 1), () => FALLBACK))).toEqual([FALLBACK]);
  });

  it("rethrows a failure after streaming has started", async () => {
    const long = "y".repeat(REFUSAL_PEEK_CHARS);
    await expect(collect(guardRefusal(chunks([long, "z"], 1), () => FALLBACK))).rejects.toThrow("stream died");
  });
});

describe("toModelMessages", () => {
  it("maps roles and keeps only recent turns", () => {
    const turns = Array.from({ length: NPC_CONTEXT_TURNS + 3 }, (_, i) => ({
      role: i % 2 === 0 ? ("npc" as const) : ("player" as const),
      text: `t${i}`,
    }));
    const messages = toModelMessages(turns);
    expect(messages).toHaveLength(NPC_CONTEXT_TURNS);
    expect(messages.at(-1)).toEqual({ role: "assistant", content: `t${NPC_CONTEXT_TURNS + 2}` });
    expect(messages.at(-2)).toEqual({ role: "user", content: `t${NPC_CONTEXT_TURNS + 1}` });
  });
});
