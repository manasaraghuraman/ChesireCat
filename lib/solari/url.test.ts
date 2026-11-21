/**
 * File: lib/solari/url.test.ts
 * Purpose: Tests for the server-side URL allowlist (SSRF guard).
 * Author: manasa
 * Date: 2026-11-21
 */
import { describe, expect, it } from "vitest";
import { MAX_URL_LENGTH, validateTargetUrl } from "./url";

describe("validateTargetUrl", () => {
  it.each(["https://example.com/a?b=1", "http://example.org"])("allows %s", (url) => {
    expect(validateTargetUrl(url).isOk).toBe(true);
  });

  it.each([
    "",
    "not a url",
    "ftp://example.com",
    "javascript:alert(1)",
    "file:///etc/passwd",
    "http://localhost:3000",
    "http://127.0.0.1",
    "http://10.1.2.3",
    "http://172.16.0.1",
    "http://192.168.1.1",
    "http://169.254.169.254/latest/meta-data",
    "http://100.64.0.1",
    "http://[::1]/",
    "http://printer.local",
    "http://user:pass@example.com",
    `https://example.com/${"a".repeat(MAX_URL_LENGTH)}`,
  ])("rejects %s", (url) => {
    expect(validateTargetUrl(url).isOk).toBe(false);
  });

  it("allows public addresses that merely look similar to private ranges", () => {
    expect(validateTargetUrl("http://172.32.0.1").isOk).toBe(true);
    expect(validateTargetUrl("http://100.128.0.1").isOk).toBe(true);
  });
});
