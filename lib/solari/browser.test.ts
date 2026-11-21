/**
 * File: lib/solari/browser.test.ts
 * Purpose: Tests that browser sessions are always released and never use stealth/proxy/captcha.
 * Author: manasa
 * Date: 2026-11-21
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { capturePage, withBrowser } from "./browser";

const close = vi.fn(async () => undefined);
const clientClose = vi.fn(async () => undefined);
const launch = vi.fn();
const getReplayUrl = vi.fn();

vi.mock("@solarisdk/browser", () => ({
  Solari: class {
    launch = launch;
    close = clientClose;
    sessions = { getReplayUrl };
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SOLARI_API_KEY", "slr_live_test");
  launch.mockResolvedValue({ id: "sess_1", close, newPage: vi.fn() });
});

describe("withBrowser", () => {
  it("returns the value and releases the session", async () => {
    const result = await withBrowser(async () => 42);
    expect(result).toEqual({ isOk: true, value: { value: 42, replayUrl: null } });
    expect(close).toHaveBeenCalled();
    expect(clientClose).toHaveBeenCalled();
  });

  it("releases the session when work throws and returns a typed failure", async () => {
    const result = await withBrowser(async () => {
      throw new Error("page crashed");
    });
    expect(result.isOk).toBe(false);
    expect(close).toHaveBeenCalled();
  });

  it("reports launch failures", async () => {
    launch.mockRejectedValueOnce(new Error("no capacity"));
    const result = await withBrowser(async () => 1);
    expect(!result.isOk && result.error.code).toBe("launch-failed");
  });

  it("returns the replay URL when recording", async () => {
    getReplayUrl.mockResolvedValue({ url: "https://replay.example/x" });
    const result = await withBrowser(async () => 1, true);
    expect(result.isOk && result.value.replayUrl).toBe("https://replay.example/x");
  });

  it("never passes stealth, proxy, or captcha to launch", async () => {
    await withBrowser(async () => 1, true);
    const options = launch.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(options).toEqual({ recording: true });
  });
});

describe("capturePage", () => {
  it("rejects internal URLs without launching a browser", async () => {
    const result = await capturePage("http://169.254.169.254/");
    expect(result.isOk).toBe(false);
    expect(launch).not.toHaveBeenCalled();
  });
});
