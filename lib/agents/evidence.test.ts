/**
 * File: lib/agents/evidence.test.ts
 * Purpose: Tests for the Trial's evidence analysis, including the offline fallback flaws.
 * Author: manasa
 * Date: 2026-11-21
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EvidenceAnalysis } from "../schemas";
import { COURT_EVIDENCE_FLAWS } from "../wonderweb/evidence";
import { analyzeEvidence, FALLBACK_ANALYSIS } from "./evidence";

const structuredWithVision = vi.fn();
vi.mock("./vision", () => ({ structuredWithVision: (...args: unknown[]) => structuredWithVision(...args) }));

beforeEach(() => vi.clearAllMocks());

const capture = { finalUrl: "https://x", title: "t", text: "Exhibit A", screenshotPngBase64: "AAAA", hasPasswordField: false };

describe("FALLBACK_ANALYSIS", () => {
  it("is a valid analysis built from the planted flaws", () => {
    expect(EvidenceAnalysis.safeParse(FALLBACK_ANALYSIS).success).toBe(true);
    expect(FALLBACK_ANALYSIS.flaws.every((flaw) => COURT_EVIDENCE_FLAWS.includes(flaw))).toBe(true);
  });
});

describe("analyzeEvidence", () => {
  it("returns the model's flaws and passes the screenshot as the image", async () => {
    structuredWithVision.mockResolvedValue({ value: { isFake: true, flaws: ["Blurry seal"] }, usedFallback: false, attempts: 1 });
    expect(await analyzeEvidence(capture)).toEqual({ isFake: true, flaws: ["Blurry seal"] });
    expect((structuredWithVision.mock.calls[0]?.[0] as { imageBase64: string }).imageBase64).toBe("AAAA");
  });

  it("falls back to the planted flaws when the models fail", async () => {
    structuredWithVision.mockResolvedValue({ value: FALLBACK_ANALYSIS, usedFallback: true, attempts: 2 });
    expect((await analyzeEvidence(capture)).flaws.length).toBeGreaterThan(0);
  });
});
