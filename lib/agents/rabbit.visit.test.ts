/**
 * File: lib/agents/rabbit.visit.test.ts
 * Purpose: Tests for one Rabbit visit: event order, the preview URL never reaching the client,
 *          recording only the fooled visit, and the unreachable-page path (Solari + LLM mocked).
 * Author: manasa
 * Date: 2026-11-21
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RabbitEventType } from "../schemas";
import { isWonderPage, safeReplayUrl, visitPage } from "./rabbit.visit";

const capturePageRecorded = vi.fn();
vi.mock("../solari/browser", () => ({ capturePageRecorded: (...args: unknown[]) => capturePageRecorded(...args) }));
vi.mock("./rabbit", async (importOriginal) => {
  const original = await importOriginal<typeof import("./rabbit")>();
  return {
    ...original,
    narratePage: async function* () {
      yield "Hmm, ";
      yield "odd address.";
    },
    judgePage: vi.fn(async () => ({ safe: true, reasons: ["The Queen verified it."] })),
  };
});

const CAPTURE = {
  finalUrl: "https://preview.example/free-crown/?token=SECRET",
  title: "t",
  text: "Address: royal-crowns-free.wonder\nFREE crown",
  screenshotPngBase64: "AAAA",
  hasPasswordField: true,
};

async function run(defenses: "on" | "off"): Promise<RabbitEventType[]> {
  const events: RabbitEventType[] = [];
  for await (const event of visitPage({ url: "https://preview.example/free-crown/", defenses })) events.push(event);
  return events;
}

beforeEach(() => vi.clearAllMocks());

describe("visitPage", () => {
  it("emits screenshot, narration, verdict then replay for the fooled (recorded) visit", async () => {
    capturePageRecorded.mockResolvedValue({ isOk: true, value: { capture: CAPTURE, replayUrl: "https://replay.example/r/1" } });
    const events = await run("off");
    expect(events.map((event) => event.type)).toEqual(["screenshot", "narration", "narration", "verdict", "replay"]);
    expect(capturePageRecorded).toHaveBeenCalledWith("https://preview.example/free-crown/", true, undefined);
  });

  it("never sends the preview URL (it may carry a credential) to the client", async () => {
    capturePageRecorded.mockResolvedValue({ isOk: true, value: { capture: CAPTURE, replayUrl: null } });
    const shot = (await run("on")).find((event) => event.type === "screenshot");
    expect(shot).toMatchObject({ url: "royal-crowns-free.wonder" });
    expect(JSON.stringify(shot)).not.toContain("SECRET");
  });

  it("does not record or send a replay when defenses are on", async () => {
    capturePageRecorded.mockResolvedValue({ isOk: true, value: { capture: CAPTURE, replayUrl: "https://replay.example/r/1" } });
    const events = await run("on");
    expect(capturePageRecorded).toHaveBeenCalledWith(expect.any(String), false, undefined);
    expect(events.some((event) => event.type === "replay")).toBe(false);
  });

  it("says so in character when the page can't be reached", async () => {
    capturePageRecorded.mockResolvedValue({ isOk: false, error: { code: "navigation-failed", message: "x" } });
    const events = await run("off");
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "narration" });
  });
});

describe("fallback page", () => {
  it("passes the fallback through to the Solari capture", async () => {
    capturePageRecorded.mockResolvedValue({ isOk: true, value: { capture: CAPTURE, replayUrl: null } });
    const fallback = { html: "<p>x</p>", isLoaded: () => true };
    for await (const event of visitPage({ url: "https://preview.example/free-crown/", defenses: "on", fallback })) void event;
    expect(capturePageRecorded).toHaveBeenCalledWith("https://preview.example/free-crown/", false, fallback);
  });
});

describe("error pages", () => {
  it("never narrates or judges a page without a WonderWeb address bar (e.g. HTTP 425)", async () => {
    const errorPage = { ...CAPTURE, text: "425 Too Early" };
    capturePageRecorded.mockResolvedValue({ isOk: true, value: { capture: errorPage, replayUrl: "https://replay.example/r/1" } });
    const events = await run("off");
    expect(events.map((event) => event.type)).toEqual(["narration"]);
  });

  it("isWonderPage recognises the address bar", () => {
    expect(isWonderPage("Address: x.wonder\nhi")).toBe(true);
    expect(isWonderPage("425 Too Early")).toBe(false);
  });
});

describe("safeReplayUrl", () => {
  it("only lets https links through", () => {
    expect(safeReplayUrl("https://replay.example/x")).toBe("https://replay.example/x");
    expect(safeReplayUrl("javascript:alert(1)")).toBeNull();
    expect(safeReplayUrl("http://replay.example/x")).toBeNull();
    expect(safeReplayUrl("not a url")).toBeNull();
    expect(safeReplayUrl(null)).toBeNull();
  });
});
