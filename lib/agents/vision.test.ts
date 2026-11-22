/**
 * File: lib/agents/vision.test.ts
 * Purpose: Tests for the vision → text-only → offline fallback chain (LLM mocked).
 * Author: manasa
 * Date: 2026-11-21
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { structuredWithVision } from "./vision";

const generateStructured = vi.fn();
vi.mock("../llm", () => ({
  generateStructured: (...args: unknown[]) => generateStructured(...args),
  textModel: () => "text-model",
  visionModel: () => "vision-model",
}));

const schema = z.object({ ok: z.boolean() });
const options = {
  system: "s",
  text: "page text",
  imageBase64: "AAAA",
  wireSchema: schema,
  schema,
  fallback: { ok: false },
};

beforeEach(() => vi.clearAllMocks());

describe("structuredWithVision", () => {
  it("returns the vision result when the vision model succeeds", async () => {
    generateStructured.mockResolvedValueOnce({ value: { ok: true }, usedFallback: false, attempts: 1 });
    const result = await structuredWithVision(options);
    expect(result.value).toEqual({ ok: true });
    expect(generateStructured).toHaveBeenCalledTimes(1);
    const call = generateStructured.mock.calls[0]?.[0] as { model: string; messages: { content: { type: string }[] }[] };
    expect(call.model).toBe("vision-model");
    expect(call.messages[0]?.content.map((part) => part.type)).toEqual(["text", "file"]);
  });

  it("retries on the text model without the image when vision fails", async () => {
    generateStructured
      .mockResolvedValueOnce({ value: { ok: false }, usedFallback: true, attempts: 2 })
      .mockResolvedValueOnce({ value: { ok: true }, usedFallback: false, attempts: 1 });
    const result = await structuredWithVision(options);
    expect(result.value).toEqual({ ok: true });
    const second = generateStructured.mock.calls[1]?.[0] as { model: string; messages: { content: unknown }[] };
    expect(second.model).toBe("text-model");
    expect(second.messages[0]?.content).toBe("page text");
  });

  it("surfaces the offline fallback when both models fail", async () => {
    generateStructured.mockResolvedValue({ value: { ok: false }, usedFallback: true, attempts: 2 });
    const result = await structuredWithVision(options);
    expect(result.usedFallback).toBe(true);
    expect(result.value).toEqual({ ok: false });
  });
});
