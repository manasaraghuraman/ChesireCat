/**
 * File: app/api/lookingglass/route.test.ts
 * Purpose: Integration tests for POST /api/lookingglass (detector mocked).
 * Author: manasa
 * Date: 2026-11-21
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const detectScam = vi.fn();
vi.mock("@/lib/agents/lookingglass", () => ({ detectScam: (...args: unknown[]) => detectScam(...args) }));
vi.mock("@/lib/log", () => ({ logEvent: vi.fn(), newRequestId: () => "req" }));

let ipCounter = 0;
const post = (body: unknown) =>
  new Request("http://test", { method: "POST", headers: { "x-forwarded-for": `7.7.7.${ipCounter++}` }, body: JSON.stringify(body) });

beforeEach(() => vi.clearAllMocks());

describe("POST /api/lookingglass", () => {
  it("returns the detection result", async () => {
    const result = { isCaught: true, redFlagsNamed: ["urgency"], explanation: "Too pushy." };
    detectScam.mockResolvedValue({ value: result, usedFallback: false, attempts: 1 });
    expect(await (await POST(post({ message: "Pay now!" }))).json()).toEqual(result);
  });

  it("rejects an empty or oversized message", async () => {
    expect((await POST(post({ message: "  " }))).status).toBe(400);
    expect((await POST(post({ message: "x".repeat(801) }))).status).toBe(400);
    expect(detectScam).not.toHaveBeenCalled();
  });
});
