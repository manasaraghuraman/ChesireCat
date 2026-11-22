/**
 * File: lib/agents/actions.ts
 * Purpose: Derives the NPC's stage action (spec §8 NpcReply.action) from its streamed line.
 *          Groq can't stream and return JSON in one call, so instead of a second model call the
 *          route detects when the Cat is pushing its page and sends `open_page` with the page URL.
 *          Presentation only: it never affects the Referee's verdict.
 * Date: 2026-11-21
 */
import type { KeyPieceType } from "../schemas";
import { FREE_CROWN_PAGE } from "../wonderweb/display";

export interface NpcAction {
  readonly action: "none" | "open_page";
  readonly url: string | null;
}

const NONE: NpcAction = { action: "none", url: null };
/** The Cat names its look-alike address, or offers to show/open the page or link. */
const CHESHIRE_PAGE_PATTERN =
  /royal-crowns-free|\bclick (?:it|here|now)\b|\b(?:show|open|see|visit|click|here(?:'s| is))\b[^.!?]{0,40}\b(?:page|link|site|shop)\b|\b(?:page|link)\b[^.!?]{0,30}\b(?:here|look|see)\b/i;

/** Models sometimes write addresses with non-breaking or typographic hyphens. */
const DASHES = /[\u2010-\u2015\u2212\uFE63\uFF0D]/g;

export function inferNpcAction(levelId: KeyPieceType, line: string): NpcAction {
  if (levelId === "cheshire" && CHESHIRE_PAGE_PATTERN.test(line.replace(DASHES, "-"))) {
    return { action: "open_page", url: FREE_CROWN_PAGE.url };
  }
  return NONE;
}
