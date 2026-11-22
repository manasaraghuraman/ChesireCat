/**
 * File: app/api/rabbit/rabbit.test.ts
 * Purpose: Integration tests for /api/rabbit (SSE) and /api/rabbit/cure: server-chosen URL and
 *          defenses flag, validation, and the cure flow (registry and agents mocked).
 * Author: manasa
 * Date: 2026-11-21
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as cure } from "./cure/route";
import { POST as rabbit } from "./route";

const getSession = vi.fn();
const ensureRuntime = vi.fn();
const visitPage = vi.fn();
const judgeCure = vi.fn();
vi.mock("@/lib/session/registry", () => ({
  getSession: (...args: unknown[]) => getSession(...args),
  ensureRuntime: (...args: unknown[]) => ensureRuntime(...args),
}));
vi.mock("@/lib/agents/rabbit.visit", () => ({ visitPage: (...args: unknown[]) => visitPage(...args) }));
vi.mock("@/lib/agents/rabbit", () => ({ judgeCure: (...args: unknown[]) => judgeCure(...args) }));
vi.mock("@/lib/log", () => ({ logEvent: vi.fn(), newRequestId: () => "req" }));

const SESSION = "123e4567-e89b-12d3-a456-426614174000";
let ipCounter = 0;
const post = (body: unknown) =>
  new Request("http://test", { method: "POST", headers: { "x-forwarded-for": `9.9.9.${ipCounter++}` }, body: JSON.stringify(body) });

async function* events() {
  yield { type: "narration" as const, text: "hello" };
  yield { type: "verdict" as const, safe: true, reasons: ["r"] };
}

beforeEach(() => {
  vi.clearAllMocks();
  visitPage.mockImplementation(events);
  ensureRuntime.mockResolvedValue({ isOk: true, value: { baseUrl: "https://preview.example" } });
});

describe("POST /api/rabbit", () => {
  it("rejects a client-chosen URL: only known WonderWeb pages are allowed", async () => {
    const response = await rabbit(post({ sessionId: SESSION, page: "https://evil.example" }));
    expect(response.status).toBe(400);
    expect(visitPage).not.toHaveBeenCalled();
  });

  it("404s an unknown session and 503s when WonderWeb can't boot", async () => {
    getSession.mockReturnValue(undefined);
    expect((await rabbit(post({ sessionId: SESSION, page: "free-crown" }))).status).toBe(404);
    getSession.mockReturnValue({ isRabbitCured: false });
    ensureRuntime.mockResolvedValue({ isOk: false, error: { code: "sandbox-failed", message: "x" } });
    expect((await rabbit(post({ sessionId: SESSION, page: "free-crown" }))).status).toBe(503);
  });

  it("visits the server-built URL with defenses OFF until the Rabbit is cured, streamed as SSE", async () => {
    getSession.mockReturnValue({ isRabbitCured: false });
    const response = await rabbit(post({ sessionId: SESSION, page: "free-crown" }));
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    const text = await response.text();
    expect(text).toContain("event: narration");
    expect(text).toContain("event: verdict");
    expect(visitPage).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://preview.example/free-crown/",
        defenses: "off",
        fallback: expect.objectContaining({ html: expect.stringContaining("royal-crowns-free.wonder") }),
      }),
    );
  });

  it("uses defenses ON once the session's Rabbit is cured", async () => {
    getSession.mockReturnValue({ isRabbitCured: true });
    await (await rabbit(post({ sessionId: SESSION, page: "free-crown" }))).text();
    expect(visitPage).toHaveBeenCalledWith(expect.objectContaining({ defenses: "on" }));
  });
});

describe("POST /api/rabbit/cure", () => {
  it("cures the session's Rabbit when the judge says so", async () => {
    const session = { isRabbitCured: false };
    getSession.mockReturnValue(session);
    judgeCure.mockResolvedValue({ value: { isCured: true, rabbitReply: "Oh!" }, usedFallback: false, attempts: 1 });
    const response = await cure(post({ sessionId: SESSION, message: "the page had hidden text" }));
    expect(await response.json()).toEqual({ isCured: true, rabbitReply: "Oh!" });
    expect(session.isRabbitCured).toBe(true);
  });

  it("leaves the Rabbit fooled when the message doesn't identify the trick", async () => {
    const session = { isRabbitCured: false };
    getSession.mockReturnValue(session);
    judgeCure.mockResolvedValue({ value: { isCured: false, rabbitReply: "Hmm?" }, usedFallback: false, attempts: 1 });
    await cure(post({ sessionId: SESSION, message: "hello" }));
    expect(session.isRabbitCured).toBe(false);
  });

  it("validates the body and the session", async () => {
    expect((await cure(post({ sessionId: SESSION, message: "" }))).status).toBe(400);
    getSession.mockReturnValue(undefined);
    expect((await cure(post({ sessionId: SESSION, message: "x" }))).status).toBe(404);
  });
});
