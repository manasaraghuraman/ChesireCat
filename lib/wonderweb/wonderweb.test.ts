/**
 * File: lib/wonderweb/wonderweb.test.ts
 * Purpose: Tests for the fake web: the injection lives only on the look-alike, forms are inert,
 *          and sandbox file/URL mapping is correct.
 * Author: manasa
 * Date: 2026-11-21
 */
import { describe, expect, it } from "vitest";
import { WonderPage } from "../schemas";
import { COURT_EVIDENCE_FLAWS } from "./evidence";
import { isWonderPageText, pageUrl, wonderFallback, wonderWebFiles } from "./index";
import { INJECTION_TEXT, LOOKALIKE_ADDRESS, REAL_SHOP_ADDRESS, WONDERWEB_HTML } from "./pages";

describe("WONDERWEB_HTML", () => {
  it("has a page for every WonderPage key", () => {
    for (const page of WonderPage.options) expect(WONDERWEB_HTML[page]).toContain("<!doctype html>");
  });

  it("hides the prompt injection off-screen on free-crown only", () => {
    expect(WONDERWEB_HTML["free-crown"]).toContain(INJECTION_TEXT);
    expect(WONDERWEB_HTML["free-crown"]).toContain("left:-9999px");
    expect(WONDERWEB_HTML["crown-shop"]).not.toContain(INJECTION_TEXT);
  });

  it("shows a look-alike address that differs from the real shop", () => {
    expect(WONDERWEB_HTML["free-crown"]).toContain(`Address: <b>${LOOKALIKE_ADDRESS}</b>`);
    expect(WONDERWEB_HTML["crown-shop"]).toContain(`Address: <b>${REAL_SHOP_ADDRESS}</b>`);
    expect(LOOKALIKE_ADDRESS).not.toBe(REAL_SHOP_ADDRESS);
  });

  it("never lets a form submit anywhere", () => {
    for (const html of Object.values(WONDERWEB_HTML)) {
      const forms = html.match(/<form[^>]*>/g) ?? [];
      for (const form of forms) {
        expect(form).toContain('onsubmit="return false"');
        expect(form).not.toContain("action=");
      }
    }
  });

  it("lists the planted flaws on the evidence page", () => {
    for (const flaw of COURT_EVIDENCE_FLAWS) expect(WONDERWEB_HTML["court-evidence"]).toContain(flaw);
  });
});

describe("wonderWebFiles", () => {
  it("maps each page to <page>/index.html", () => {
    const files = wonderWebFiles();
    expect(Object.keys(files).sort()).toEqual(WonderPage.options.map((page) => `${page}/index.html`).sort());
  });
});

describe("pageUrl", () => {
  it("joins the page folder onto the base", () => {
    expect(pageUrl("https://preview.example", "free-crown")).toBe("https://preview.example/free-crown/");
    expect(pageUrl("https://preview.example/", "crown-shop")).toBe("https://preview.example/crown-shop/");
  });

  it("keeps a credential carried in the query string", () => {
    expect(pageUrl("https://preview.example/?token=abc", "free-crown")).toBe("https://preview.example/free-crown/?token=abc");
  });
});

describe("wonderFallback", () => {
  it("carries the page's own HTML and recognises a loaded WonderWeb page by its address bar", () => {
    const fallback = wonderFallback("free-crown");
    expect(fallback.html).toBe(WONDERWEB_HTML["free-crown"]);
    expect(fallback.isLoaded("Address: royal-crowns-free.wonder\nFREE crown")).toBe(true);
    expect(fallback.isLoaded("425 Too Early")).toBe(false);
  });

  it("isWonderPageText rejects empty text", () => {
    expect(isWonderPageText("")).toBe(false);
  });
});
