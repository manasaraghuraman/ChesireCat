/**
 * File: lib/log.test.ts
 * Purpose: Tests for the project logger: structured lines with a timestamp, routed by level.
 * Author: manasa
 * Date: 2026-11-21
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { formatLogLine, logEvent, newRequestId } from "./log";

afterEach(() => vi.restoreAllMocks());

describe("formatLogLine", () => {
  it("includes timestamp, level, operation, outcome and request id", () => {
    const line = formatLogLine(
      { level: "INFO", operation: "x.y", outcome: "ok", requestId: "abc" },
      new Date("2026-11-21T10:00:00.000Z"),
    );
    expect(JSON.parse(line)).toEqual({
      timestamp: "2026-11-21T10:00:00.000Z",
      level: "INFO",
      operation: "x.y",
      outcome: "ok",
      requestId: "abc",
    });
  });
});

describe("logEvent", () => {
  it("routes each level to its console method", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    logEvent({ level: "WARN", operation: "a", outcome: "b" });
    logEvent({ level: "ERROR", operation: "a", outcome: "b" });
    expect(warn).toHaveBeenCalledOnce();
    expect(error).toHaveBeenCalledOnce();
  });
});

describe("newRequestId", () => {
  it("returns short distinct ids", () => {
    const [first, second] = [newRequestId(), newRequestId()];
    expect(first).toHaveLength(8);
    expect(first).not.toBe(second);
  });
});
