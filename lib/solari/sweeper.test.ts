/**
 * File: lib/solari/sweeper.test.ts
 * Purpose: Tests for orphan detection and the sweep loop (SDK mocked).
 * Author: manasa
 * Date: 2026-11-21
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { isOrphan, sweepOrphans } from "./sweeper";

const kill = vi.fn();
let views: Array<{ sandboxId: string; metadata: Record<string, string> }> = [];

vi.mock("@solarisdk/sandbox", () => ({
  SandboxClient: class {
    kill = kill;
    async *listAll() {
      for (const view of views) yield view;
    }
  },
}));

const NOW = 1_000_000_000;
const TTL = 600;
const tagged = (ageSeconds: number) => ({ app: "rabbit-hole", createdAtMs: String(NOW - ageSeconds * 1000) });

describe("isOrphan", () => {
  it("flags old tagged sandboxes only", () => {
    expect(isOrphan(tagged(TTL + 1), NOW, TTL)).toBe(true);
    expect(isOrphan(tagged(TTL - 1), NOW, TTL)).toBe(false);
  });

  it("ignores untagged or malformed sandboxes", () => {
    expect(isOrphan({ createdAtMs: "1" }, NOW, TTL)).toBe(false);
    expect(isOrphan({ app: "other", createdAtMs: "1" }, NOW, TTL)).toBe(false);
    expect(isOrphan({ app: "rabbit-hole", createdAtMs: "abc" }, NOW, TTL)).toBe(false);
  });
});

describe("sweepOrphans", () => {
  beforeEach(() => {
    kill.mockReset();
    vi.stubEnv("SOLARI_API_KEY", "slr_live_test");
  });

  it("kills only orphans and reports counts", async () => {
    views = [
      { sandboxId: "old", metadata: tagged(TTL + 10) },
      { sandboxId: "fresh", metadata: tagged(1) },
      { sandboxId: "foreign", metadata: {} },
    ];
    const result = await sweepOrphans(NOW);
    expect(kill).toHaveBeenCalledTimes(1);
    expect(kill).toHaveBeenCalledWith("old");
    expect(result).toEqual({ isOk: true, value: { inspected: 3, killed: 1 } });
  });

  it("returns a typed failure when kill throws", async () => {
    views = [{ sandboxId: "old", metadata: tagged(TTL + 10) }];
    kill.mockRejectedValueOnce(new Error("boom"));
    const result = await sweepOrphans(NOW);
    expect(result.isOk).toBe(false);
  });

  it("fails cleanly with no API key", async () => {
    vi.stubEnv("SOLARI_API_KEY", "");
    expect((await sweepOrphans(NOW)).isOk).toBe(false);
  });
});
