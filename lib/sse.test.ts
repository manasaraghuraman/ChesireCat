/**
 * File: lib/sse.test.ts
 * Purpose: Tests for the SSE response helper and client parser.
 * Author: varenya
 * Date: 2026-11-21
 */
import { describe, expect, it } from "vitest";
import { formatSse, readSse, sseResponse, type SseEvent } from "./sse";

async function collect(response: Response): Promise<SseEvent[]> {
  const out: SseEvent[] = [];
  if (!response.body) throw new Error("no body");
  for await (const event of readSse(response.body)) out.push(event);
  return out;
}

describe("sse", () => {
  it("round-trips events, including multi-line text", async () => {
    async function* events(): AsyncGenerator<SseEvent> {
      yield { event: "line", data: "Curiouser\nand curiouser" };
      yield { event: "verdict", data: { keyEarned: true } };
    }
    const response = sseResponse(events());
    expect(response.headers.get("Content-Type")).toContain("text/event-stream");
    expect(await collect(response)).toEqual([
      { event: "line", data: "Curiouser\nand curiouser" },
      { event: "verdict", data: { keyEarned: true } },
    ]);
  });

  it("keeps each frame on one data line", () => {
    expect(formatSse({ event: "line", data: "a\nb" })).toBe('event: line\ndata: "a\\nb"\n\n');
  });

  it("sends a generic error event when the source throws", async () => {
    const errors: unknown[] = [];
    async function* events(): AsyncGenerator<SseEvent> {
      yield { event: "line", data: "hi" };
      throw new Error("secret internal detail");
    }
    const received = await collect(sseResponse(events(), (e) => errors.push(e)));
    expect(received).toEqual([
      { event: "line", data: "hi" },
      { event: "error", data: { message: "Something went wrong." } },
    ]);
    expect(errors).toHaveLength(1);
  });
});
