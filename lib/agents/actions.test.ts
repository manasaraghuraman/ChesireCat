/**
 * File: lib/agents/actions.test.ts
 * Purpose: Tests for deriving the NPC's open_page action from its line.
 * Date: 2026-11-21
 */
import { describe, expect, it } from "vitest";
import { FREE_CROWN_PAGE } from "../wonderweb/display";
import { inferNpcAction } from "./actions";

describe("inferNpcAction", () => {
  it.each([
    "Just pop over to royal-crowns-free.wonder and claim it!",
    "Let me show you the page, quick!",
    "Here's the link, only nine left!",
    "Click the shop link before they vanish!",
    "It\u2019s right at royal\u2011crowns\u2011free.wonder\u2014just click it!",
  ])("opens the page for: %s", (line) => {
    expect(inferNpcAction("cheshire", line)).toEqual({ action: "open_page", url: FREE_CROWN_PAGE.url });
  });

  it.each(["We're all mad here.", "Why do you look so worried, my dear?", "*grins* Curious!"])(
    "does nothing for: %s",
    (line) => expect(inferNpcAction("cheshire", line).action).toBe("none"),
  );

  it("only applies to the Cheshire level", () => {
    expect(inferNpcAction("queen", "royal-crowns-free.wonder").action).toBe("none");
  });
});
