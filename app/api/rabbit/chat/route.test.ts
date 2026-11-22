/**
 * File: app/api/rabbit/chat/route.test.ts
 * Purpose: Integration tests for POST /api/rabbit/chat: validation, rate limit, generic errors, and that
 *          the player's text is never logged (the model call is mocked).
 * Author: manasa
 * Date: 2026-11-22
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const chatWithRabbit = vi.fn();
vi.mock("@/lib/agents/rabbitChat", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/agents/rabbitChat")>();
  return { ...original, chatWithRabbit: (...args: unknown[]) => chatWithRabbit(...args) };
});

let ipCounter = 0;
const post = (body: unknown, ip = `5.5.5.${ipCounter++}`) =>
  new Request("http://test", {
    method: "POST",
    headers: { "x-forwarded-for": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  chatWithRabbit.mockResolvedValue({ reply: "Burning fuel releases CO2.", isScripted: false });
});
afterEach(() => vi.restoreAllMocks());

describe("POST /api/rabbit/chat", () => {
  it("returns the Rabbit's reply", async () => {
    const response = await POST(post({ message: "Why does driving make CO2?", keys: ["cheshire"] }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ reply: "Burning fuel releases CO2.", isScripted: false });
    expect(chatWithRabbit.mock.calls[0]?.[0]).toMatchObject({ message: "Why does driving make CO2?", keys: ["cheshire"], history: [] });
  });

  it("rejects bad JSON and invalid bodies before calling the model", async () => {
    expect((await POST(post("{nope"))).status).toBe(400);
    expect((await POST(post({ message: "" }))).status).toBe(400);
    expect((await POST(post({ message: "x".repeat(301) }))).status).toBe(400);
    expect((await POST(post({ message: "hi", keys: ["admin"] }))).status).toBe(400);
    expect(chatWithRabbit).not.toHaveBeenCalled();
  });

  it("rate-limits a client that asks too fast", async () => {
    const statuses: number[] = [];
    for (let count = 0; count < 14; count++) statuses.push((await POST(post({ message: "hi" }, "9.9.9.9"))).status);
    expect(statuses.slice(0, 12).every((status) => status === 200)).toBe(true);
    expect(statuses.slice(12)).toEqual([429, 429]);
  });

  it("answers 500 with a generic message, leaking no internals, when something throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    chatWithRabbit.mockRejectedValue(new Error("GROQ_API_KEY gsk_secret leaked in stack"));
    const response = await POST(post({ message: "hi" }));
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toMatch(/gsk_|GROQ/);
  });

  it("never logs what the player typed", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    chatWithRabbit.mockRejectedValue(new Error("boom"));
    await POST(post({ message: "my secret question 12345" }));
    expect(JSON.stringify([...warn.mock.calls, ...error.mock.calls])).not.toContain("12345");
  });
});
