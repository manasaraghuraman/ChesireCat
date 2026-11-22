/**
 * File: app/api/linkcheck/route.test.ts
 * Purpose: Integration tests for POST /api/linkcheck: validation, friendly errors, rate limit,
 *          and that the player's URL is never logged (link checker mocked).
 * Author: manasa
 * Date: 2026-11-21
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const checkLink = vi.fn();
const logEvent = vi.fn();
vi.mock("@/lib/agents/linkcheck", () => ({ checkLink: (...args: unknown[]) => checkLink(...args) }));
vi.mock("@/lib/log", () => ({ logEvent: (...args: unknown[]) => logEvent(...args), newRequestId: () => "req" }));

const SECRET_URL = "https://example.com/?secret=hunter2";
const post = (body: unknown, ip: string) =>
  new Request("http://test", { method: "POST", headers: { "x-forwarded-for": ip }, body: JSON.stringify(body) });

beforeEach(() => vi.clearAllMocks());

describe("POST /api/linkcheck", () => {
  it("returns the verdict JSON", async () => {
    const verdict = { finalUrl: "https://example.com", verdict: "suspicious", reasons: ["r"], checkNext: "n", screenshotPngBase64: "A" };
    checkLink.mockResolvedValue({ isOk: true, value: verdict });
    const response = await POST(post({ url: SECRET_URL }, "4.0.0.1"));
    expect(await response.json()).toEqual(verdict);
  });

  it("never logs the URL the player pasted", async () => {
    checkLink.mockResolvedValue({ isOk: false, error: { code: "navigation-failed", message: "x" } });
    await POST(post({ url: SECRET_URL }, "4.0.0.2"));
    expect(JSON.stringify(logEvent.mock.calls)).not.toContain("hunter2");
  });

  it("400s a URL Solari refuses, with kid-friendly copy", async () => {
    checkLink.mockResolvedValue({ isOk: false, error: { code: "invalid-url", message: "Internal addresses are not allowed." } });
    const response = await POST(post({ url: "http://localhost" }, "4.0.0.3"));
    expect(response.status).toBe(400);
    expect(JSON.stringify(await response.json())).not.toContain("Internal");
  });

  it("502s when the page can't be opened, without internals", async () => {
    checkLink.mockResolvedValue({ isOk: false, error: { code: "navigation-failed", message: "TimeoutError at slr_live_x" } });
    const response = await POST(post({ url: "https://down.example" }, "4.0.0.4"));
    expect(response.status).toBe(502);
    expect(JSON.stringify(await response.json())).not.toContain("slr_live");
  });

  it("400s an empty or oversized URL before opening anything", async () => {
    expect((await POST(post({ url: "" }, "4.0.0.5"))).status).toBe(400);
    expect((await POST(post({ url: "h".repeat(3000) }, "4.0.0.5"))).status).toBe(400);
    expect(checkLink).not.toHaveBeenCalled();
  });

  it("rate-limits per client", async () => {
    checkLink.mockResolvedValue({ isOk: false, error: { code: "navigation-failed", message: "x" } });
    const statuses: number[] = [];
    for (let count = 0; count < 8; count++) statuses.push((await POST(post({ url: "https://a.example" }, "4.0.0.6"))).status);
    expect(statuses.slice(-2)).toEqual([429, 429]);
  });
});
