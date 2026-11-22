/**
 * File: lib/agents/linkcheck.test.ts
 * Purpose: Tests for the link checker: urgency detection, offline judgement, and the full flow
 *          with Solari and the vision model mocked.
 * Author: manasa
 * Date: 2026-11-21
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PageCapture } from "../solari/browser";
import { checkLink, detectUrgencyPhrases, heuristicLinkJudgement } from "./linkcheck";

const capturePage = vi.fn();
const structuredWithVision = vi.fn();
vi.mock("../solari/browser", () => ({ capturePage: (...args: unknown[]) => capturePage(...args) }));
vi.mock("./vision", () => ({ structuredWithVision: (...args: unknown[]) => structuredWithVision(...args) }));

const page = (overrides: Partial<PageCapture> = {}): PageCapture => ({
  finalUrl: "https://example.com/final",
  title: "Example",
  text: "Welcome",
  screenshotPngBase64: "AAAA",
  hasPasswordField: false,
  ...overrides,
});

beforeEach(() => vi.clearAllMocks());

describe("detectUrgencyPhrases", () => {
  it("finds pressure phrases once each, case-insensitively", () => {
    const found = detectUrgencyPhrases("ACT NOW! Only 3 left. Act now or pay within 10 minutes.");
    expect(found).toEqual(expect.arrayContaining(["act now", "only 3 left", "within 10 minutes"]));
    expect(found.filter((phrase) => phrase === "act now")).toHaveLength(1);
  });

  it("returns nothing for calm text and caps the list", () => {
    expect(detectUrgencyPhrases("A recipe for tea.")).toEqual([]);
    const everything = "act now last chance pay now urgent only 1 left within 5 hours expires today your account will be closed";
    expect(detectUrgencyPhrases(everything).length).toBeLessThanOrEqual(5);
  });
});

describe("heuristicLinkJudgement", () => {
  it("is suspicious with a password field or urgency, and mentions why", () => {
    const judged = heuristicLinkJudgement(page({ hasPasswordField: true }), ["act now"]);
    expect(judged.verdict).toBe("suspicious");
    expect(judged.reasons.length).toBe(2);
  });

  it("is hedged 'likely-safe' with no signals", () => {
    const judged = heuristicLinkJudgement(page(), []);
    expect(judged.verdict).toBe("likely-safe");
    expect(judged.reasons[0]).toContain("only a quick look");
  });
});

describe("checkLink", () => {
  it("passes a Solari failure (e.g. a blocked internal address) straight back", async () => {
    capturePage.mockResolvedValue({ isOk: false, error: { code: "invalid-url", message: "Internal addresses are not allowed." } });
    const result = await checkLink("http://localhost:3000");
    expect(result).toMatchObject({ isOk: false, error: { code: "invalid-url" } });
    expect(structuredWithVision).not.toHaveBeenCalled();
  });

  it("returns the verdict with the final URL and the screenshot", async () => {
    capturePage.mockResolvedValue({ isOk: true, value: page({ hasPasswordField: true }) });
    structuredWithVision.mockResolvedValue({
      value: { verdict: "likely-scam", reasons: ["Asks for a password"], checkNext: "Check the address." },
      usedFallback: false,
      attempts: 1,
    });
    const result = await checkLink("https://example.com/start");
    expect(result).toMatchObject({
      isOk: true,
      value: { verdict: "likely-scam", finalUrl: "https://example.com/final", screenshotPngBase64: "AAAA" },
    });
    const options = structuredWithVision.mock.calls[0]?.[0] as { text: string; imageBase64: string };
    expect(options.imageBase64).toBe("AAAA");
    expect(options.text).toContain("Password field present: yes");
    expect(options.text).toContain("<page>");
  });

  it("flags a redirect to a different site in the model's facts", async () => {
    capturePage.mockResolvedValue({ isOk: true, value: page({ finalUrl: "https://other.example/x" }) });
    structuredWithVision.mockResolvedValue({
      value: { verdict: "suspicious", reasons: ["r"], checkNext: "n" },
      usedFallback: true,
      attempts: 2,
    });
    await checkLink("https://example.com/start");
    const options = structuredWithVision.mock.calls[0]?.[0] as { text: string };
    expect(options.text).toContain("redirected to a different site");
  });
});
