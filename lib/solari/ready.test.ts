/**
 * File: lib/solari/ready.test.ts
 * Purpose: Tests for the preview readiness probe (fetch and sleep injected).
 * Author: manasa
 * Date: 2026-11-21
 */
import { describe, expect, it, vi } from "vitest";
import { READY_MAX_ATTEMPTS, waitUntilServing } from "./ready";

const URL_UNDER_TEST = "https://preview.example/crown-shop/";

describe("waitUntilServing", () => {
  it("returns true as soon as the preview answers 2xx", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    const sleep = vi.fn(async () => undefined);
    expect(await waitUntilServing(URL_UNDER_TEST, { fetchImpl, sleep })).toBe(true);
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(sleep).not.toHaveBeenCalled();
  });

  it("keeps trying through 425 'Too Early' responses and network errors", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockRejectedValueOnce(new Error("socket hang up"))
      .mockResolvedValueOnce({ ok: true });
    const sleep = vi.fn(async () => undefined);
    expect(await waitUntilServing(URL_UNDER_TEST, { fetchImpl, sleep })).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it("gives up after the maximum attempts instead of waiting forever", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false });
    const sleep = vi.fn(async () => undefined);
    expect(await waitUntilServing(URL_UNDER_TEST, { fetchImpl, sleep })).toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(READY_MAX_ATTEMPTS);
  });

  it("refuses to request a disallowed URL (internal host) at all", async () => {
    const fetchImpl = vi.fn();
    expect(await waitUntilServing("http://169.254.169.254/latest", { fetchImpl, sleep: vi.fn() })).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
