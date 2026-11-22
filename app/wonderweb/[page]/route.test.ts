/**
 * File: app/wonderweb/[page]/route.test.ts
 * Purpose: Tests for the fallback WonderWeb host: known pages only, locked-down headers.
 * Author: manasa
 * Date: 2026-11-21
 */
import { describe, expect, it } from "vitest";
import { GET } from "./route";

const get = (page: string) => GET(new Request("http://test"), { params: Promise.resolve({ page }) });

describe("GET /wonderweb/[page]", () => {
  it("serves a known page with a CSP that blocks form submission and scripts", async () => {
    const response = await get("free-crown");
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("royal-crowns-free.wonder");
    const csp = response.headers.get("content-security-policy") ?? "";
    expect(csp).toContain("form-action 'none'");
    expect(csp).toContain("default-src 'none'");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("404s anything that isn't a WonderWeb page", async () => {
    expect((await get("../package.json")).status).toBe(404);
    expect((await get("nope")).status).toBe(404);
  });
});
