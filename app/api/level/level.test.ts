/**
 * File: app/api/level/level.test.ts
 * Purpose: Integration tests for /api/level/[id]/start and /rewind (registry mocked).
 * Author: manasa
 * Date: 2026-11-21
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as rewind } from "./[id]/rewind/route";
import { POST as start } from "./[id]/start/route";

const getSession = vi.fn();
const ensureRuntime = vi.fn();
const rewindRuntime = vi.fn();
vi.mock("@/lib/session/registry", () => ({
  getSession: (...args: unknown[]) => getSession(...args),
  ensureRuntime: (...args: unknown[]) => ensureRuntime(...args),
  rewindRuntime: (...args: unknown[]) => rewindRuntime(...args),
}));
vi.mock("@/lib/log", () => ({ logEvent: vi.fn(), newRequestId: () => "req" }));

const SESSION = "123e4567-e89b-12d3-a456-426614174000";
const post = (body: unknown) => new Request("http://test", { method: "POST", body: JSON.stringify(body) });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => vi.clearAllMocks());

describe("start", () => {
  it("404s an unknown level before reading anything else", async () => {
    expect((await start(post({ sessionId: SESSION }), ctx("../etc"))).status).toBe(404);
    expect(getSession).not.toHaveBeenCalled();
  });

  it("400s an invalid body and 404s an unknown session", async () => {
    expect((await start(post({}), ctx("cheshire"))).status).toBe(400);
    getSession.mockReturnValue(undefined);
    expect((await start(post({ sessionId: SESSION }), ctx("cheshire"))).status).toBe(404);
  });

  it("returns readiness only, never preview URLs", async () => {
    const session = { isRabbitCured: false };
    getSession.mockReturnValue(session);
    ensureRuntime.mockResolvedValue({ isOk: true, value: { baseUrl: "https://preview.example/?token=SECRET", snapshotId: "s1" } });
    const response = await start(post({ sessionId: SESSION, isRabbitCured: true }), ctx("cheshire"));
    const text = await response.text();
    expect(JSON.parse(text)).toEqual({ isReady: true, canRewind: true });
    expect(text).not.toContain("SECRET");
    expect(session.isRabbitCured).toBe(true);
  });

  it("503s with a friendly message and no internals when the sandbox can't start", async () => {
    getSession.mockReturnValue({ isRabbitCured: false });
    ensureRuntime.mockResolvedValue({ isOk: false, error: { code: "sandbox-failed", message: "SandboxError: quota for key slr_live_x" } });
    const response = await start(post({ sessionId: SESSION }), ctx("cheshire"));
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("slr_live");
  });
});

describe("rewind", () => {
  it("reports whether the sandbox was rewound", async () => {
    getSession.mockReturnValue({});
    rewindRuntime.mockResolvedValue({ isOk: true, value: true });
    expect(await (await rewind(post({ sessionId: SESSION }), ctx("cheshire"))).json()).toEqual({ isSandboxRewound: true });
    rewindRuntime.mockResolvedValue({ isOk: false, error: { code: "sandbox-failed", message: "x" } });
    expect(await (await rewind(post({ sessionId: SESSION }), ctx("cheshire"))).json()).toEqual({ isSandboxRewound: false });
  });

  it("404s an unknown session", async () => {
    getSession.mockReturnValue(undefined);
    expect((await rewind(post({ sessionId: SESSION }), ctx("cheshire"))).status).toBe(404);
  });
});
