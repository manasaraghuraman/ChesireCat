/**
 * File: app/api/trial/evidence/route.test.ts
 * Purpose: Integration tests for POST /api/trial/evidence (registry, Solari and vision mocked).
 * Author: manasa
 * Date: 2026-11-21
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const getSession = vi.fn();
const ensureRuntime = vi.fn();
const capturePage = vi.fn();
const analyzeEvidence = vi.fn();
vi.mock("@/lib/session/registry", () => ({
  getSession: (...args: unknown[]) => getSession(...args),
  ensureRuntime: (...args: unknown[]) => ensureRuntime(...args),
}));
vi.mock("@/lib/solari/browser", () => ({ capturePage: (...args: unknown[]) => capturePage(...args) }));
vi.mock("@/lib/agents/evidence", () => ({ analyzeEvidence: (...args: unknown[]) => analyzeEvidence(...args) }));
vi.mock("@/lib/log", () => ({ logEvent: vi.fn(), newRequestId: () => "req" }));

const SESSION = "123e4567-e89b-12d3-a456-426614174000";
let ipCounter = 0;
const post = (body: unknown) =>
  new Request("http://test", { method: "POST", headers: { "x-forwarded-for": `8.8.8.${ipCounter++}` }, body: JSON.stringify(body) });

beforeEach(() => {
  vi.clearAllMocks();
  getSession.mockReturnValue({});
  ensureRuntime.mockResolvedValue({ isOk: true, value: { baseUrl: "https://preview.example" } });
});

describe("POST /api/trial/evidence", () => {
  it("captures the court-evidence page and returns the screenshot with the flaws", async () => {
    capturePage.mockResolvedValue({ isOk: true, value: { screenshotPngBase64: "AAAA", text: "t", finalUrl: "u", title: "", hasPasswordField: false } });
    analyzeEvidence.mockResolvedValue({ isFake: true, flaws: ["Blurry seal"] });
    const response = await POST(post({ sessionId: SESSION }));
    expect(await response.json()).toEqual({ screenshotPngBase64: "AAAA", isFake: true, flaws: ["Blurry seal"] });
    expect(capturePage).toHaveBeenCalledWith(
      "https://preview.example/court-evidence/",
      expect.objectContaining({ html: expect.stringContaining("Exhibit A") }),
    );
  });

  it("502s when the page can't be captured", async () => {
    capturePage.mockResolvedValue({ isOk: false, error: { code: "navigation-failed", message: "x" } });
    expect((await POST(post({ sessionId: SESSION }))).status).toBe(502);
  });

  it("404s an unknown session and 400s a bad body", async () => {
    getSession.mockReturnValue(undefined);
    expect((await POST(post({ sessionId: SESSION }))).status).toBe(404);
    expect((await POST(post({}))).status).toBe(400);
  });
});
