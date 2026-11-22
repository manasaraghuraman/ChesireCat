/**
 * File: lib/solari/browser.test.ts
 * Purpose: Tests that browser sessions are always released and never use stealth/proxy/captcha.
 * Author: manasa
 * Date: 2026-11-21
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { capturePage, capturePageRecorded, gotoWithRetry, HTTP_TOO_EARLY, TOO_EARLY_MAX_RETRIES, withBrowser } from "./browser";

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

describe("gotoWithRetry", () => {
  const response = (status: number) => ({ status: () => status });
  const makePage = (...statuses: number[]) => {
    const goto = vi.fn();
    for (const status of statuses) goto.mockResolvedValueOnce(response(status));
    return { goto, waitForTimeout: vi.fn(async () => undefined) };
  };
  const run = (page: ReturnType<typeof makePage>) => gotoWithRetry(page as never, "https://preview.example/");

  it("navigates once when the page loads normally", async () => {
    const page = makePage(200);
    await run(page);
    expect(page.goto).toHaveBeenCalledOnce();
    expect(page.waitForTimeout).not.toHaveBeenCalled();
  });

  it("repeats the request after a 425 'Too Early' until the page is ready", async () => {
    const page = makePage(HTTP_TOO_EARLY, HTTP_TOO_EARLY, 200);
    await run(page);
    expect(page.goto).toHaveBeenCalledTimes(3);
  });

  it("gives up after the retry limit instead of looping forever", async () => {
    const page = makePage(...Array<number>(TOO_EARLY_MAX_RETRIES + 1).fill(HTTP_TOO_EARLY));
    await run(page);
    expect(page.goto).toHaveBeenCalledTimes(TOO_EARLY_MAX_RETRIES + 1);
  });

  it("does not retry other error statuses (a real 404 page is legitimate content)", async () => {
    const page = makePage(404);
    await run(page);
    expect(page.goto).toHaveBeenCalledOnce();
  });

  it("tolerates navigations that return no response (e.g. about:blank)", async () => {
    const page = { goto: vi.fn(async () => null), waitForTimeout: vi.fn() };
    await run(page as never);
    expect(page.goto).toHaveBeenCalledOnce();
  });
});

describe("capturePageRecorded fallback", () => {
  const makeSession = (initialText: string, fallbackText: string) => {
    let text = initialText;
    const page = {
      goto: vi.fn(async () => ({ status: () => 200 })),
      waitForTimeout: vi.fn(),
      evaluate: vi.fn(async () => text),
      setContent: vi.fn(async () => {
        text = fallbackText;
      }),
      screenshot: vi.fn(async () => Buffer.from("png")),
      locator: vi.fn(() => ({ count: async () => 0 })),
      url: () => "about:blank",
      title: async () => "t",
    };
    launch.mockResolvedValue({ id: "sess_1", close, newPage: vi.fn(async () => page) });
    return page;
  };
  const fallback = { html: "<p>Address: x.wonder</p>", isLoaded: (text: string) => text.includes("Address:") };

  it("loads the fallback HTML into the Solari browser when the URL serves an error page", async () => {
    const page = makeSession("425 Too Early", "Address: x.wonder");
    const result = await capturePageRecorded("https://preview.example/free-crown/", false, fallback);
    expect(page.setContent).toHaveBeenCalledWith(fallback.html, { waitUntil: "load" });
    expect(result.isOk && result.value.capture.text).toBe("Address: x.wonder");
  });

  it("leaves a correctly loaded page alone", async () => {
    const page = makeSession("Address: x.wonder", "unused");
    await capturePageRecorded("https://preview.example/free-crown/", false, fallback);
    expect(page.setContent).not.toHaveBeenCalled();
  });

  it("never uses a fallback when none is given (link checker: real pages stay real)", async () => {
    const page = makeSession("a 404 page", "unused");
    await capturePageRecorded("https://example.com/missing", false);
    expect(page.setContent).not.toHaveBeenCalled();
  });
});
