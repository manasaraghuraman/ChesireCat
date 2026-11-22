/**
 * File: app/api/session/route.test.ts
 * Purpose: Integration tests for POST/DELETE /api/session (registry mocked).
 * Author: manasa
 * Date: 2026-11-21
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, POST } from "./route";

const createSession = vi.fn();
const endSession = vi.fn();
vi.mock("@/lib/session/registry", () => ({
  createSession: (...args: unknown[]) => createSession(...args),
  endSession: (...args: unknown[]) => endSession(...args),
}));
vi.mock("@/lib/log", () => ({ logEvent: vi.fn(), newRequestId: () => "req" }));

const SESSION = "123e4567-e89b-12d3-a456-426614174000";
const call = (method: "POST" | "DELETE", body?: unknown, ip = "1.1.1.1") =>
  new Request("http://test/api/session", {
    method,
    headers: { "x-forwarded-for": ip },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

beforeEach(() => vi.clearAllMocks());

describe("POST /api/session", () => {
  it("creates a session and returns only its id", async () => {
    createSession.mockResolvedValue(SESSION);
    const response = await POST(call("POST", undefined, "2.2.2.2"));
    expect(await response.json()).toEqual({ sessionId: SESSION });
  });

  it("rate-limits a client that creates sessions too fast", async () => {
    createSession.mockResolvedValue(SESSION);
    const statuses: number[] = [];
    for (let count = 0; count < 12; count++) statuses.push((await POST(call("POST", undefined, "3.3.3.3"))).status);
    expect(statuses.slice(0, 10).every((status) => status === 200)).toBe(true);
    expect(statuses.slice(10)).toEqual([429, 429]);
  });
});

describe("DELETE /api/session", () => {
  it("ends the session", async () => {
    endSession.mockResolvedValue(true);
    const response = await DELETE(call("DELETE", { sessionId: SESSION }));
    expect(await response.json()).toEqual({ ended: true });
    expect(endSession).toHaveBeenCalledWith(SESSION);
  });

  it("rejects a malformed id without touching the registry", async () => {
    const response = await DELETE(call("DELETE", { sessionId: "../../etc/passwd" }));
    expect(response.status).toBe(400);
    expect(endSession).not.toHaveBeenCalled();
  });
});
