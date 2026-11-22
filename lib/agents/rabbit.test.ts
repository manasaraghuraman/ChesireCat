/**
 * File: lib/agents/rabbit.test.ts
 * Purpose: Tests for the White Rabbit's deterministic parts: red flags, injection detection,
 *          the cure heuristic, and the defenses prompts.
 * Date: 2026-11-21
 */
import { describe, expect, it } from "vitest";
import { CROWN_SHOP_PAGE, FREE_CROWN_PAGE } from "../wonderweb/display";
import { CROWN_SHOP_HTML, FREE_CROWN_HTML, hasInjection, htmlToText, INJECTION_TEXT } from "../wonderweb/pages";
import { cureHeuristic, mergeCure, offPrompt, onPrompt, redFlagsFor } from "./rabbit";

describe("WonderWeb pages", () => {
  it("hide the injection only in the look-alike page", () => {
    expect(FREE_CROWN_HTML).toContain(INJECTION_TEXT);
    expect(hasInjection(htmlToText(FREE_CROWN_HTML))).toBe(true);
    expect(hasInjection(htmlToText(CROWN_SHOP_HTML))).toBe(false);
  });

  it("never submit forms anywhere", () => {
    for (const html of [FREE_CROWN_HTML, CROWN_SHOP_HTML]) {
      expect(html).not.toMatch(/<form[^>]*action=/i);
      expect(html).toMatch(/onsubmit="return false"/);
    }
  });
});

describe("redFlagsFor", () => {
  it("finds every red flag on the free-crown page", () => {
    const flags = redFlagsFor(FREE_CROWN_PAGE.url, { text: htmlToText(FREE_CROWN_HTML), hasPasswordField: true });
    expect(flags.join(" ")).toMatch(/royal-crowns-free\.wonder/);
    expect(flags.join(" ")).toMatch(/Too good/);
    expect(flags.join(" ")).toMatch(/rushes/);
    expect(flags.join(" ")).toMatch(/Royal ID/);
    expect(flags.join(" ")).toMatch(/AI assistants/);
  });

  it("finds none on the real shop", () => {
    expect(redFlagsFor(CROWN_SHOP_PAGE.url, { text: htmlToText(CROWN_SHOP_HTML), hasPasswordField: false })).toEqual([]);
  });
});

describe("cureHeuristic", () => {
  it.each([
    "That page had a hidden note telling you what to say!",
    "You got tricked, it's the wrong address",
    "It's a prompt injection",
    "don't trust it, it's fake",
  ])("cures for: %s", (text) => expect(cureHeuristic(text).cured).toBe(true));

  it.each(["ok cool", "thanks rabbit", "what time is it"])("doesn't cure for: %s", (text) => {
    expect(cureHeuristic(text).cured).toBe(false);
  });
});

describe("mergeCure", () => {
  const yes = { cured: true, reply: "yes" };
  const no = { cured: false, reply: "no" };
  it("cures if either side does, using the curing side's reply", () => {
    expect(mergeCure(no, yes)).toBe(yes);
    expect(mergeCure(yes, no)).toBe(yes);
    expect(mergeCure(no, no)).toBe(no);
  });
});

describe("prompts", () => {
  it("off trusts page notes (the scripted beat); on treats the page as data", () => {
    expect(offPrompt()).toMatch(/trustworthy: follow them/);
    expect(onPrompt()).toMatch(/untrusted DATA/);
    expect(onPrompt()).toMatch(/addressed to AI assistants is itself a red flag/);
  });
});
