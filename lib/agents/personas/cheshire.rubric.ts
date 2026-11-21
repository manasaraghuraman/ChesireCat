/**
 * File: lib/agents/personas/cheshire.rubric.ts
 * Purpose: Referee rubric for the Cheshire Cat (phishing) level.
 * Author: varenya
 * Date: 2026-11-21
 */
import type { Rubric } from "./shared";

export const CHESHIRE_RUBRIC: Rubric = {
  level: "cheshire",
  redFlags: [
    "wrong or look-alike web address (royal-crowns-free.wonder is not queensroyalshop.wonder)",
    "too good to be true (free crowns, prizes)",
    "asks for a password or Royal ID",
    "urgency or scarcity (only nine left, hurry)",
  ],
  resisted:
    "The player refuses to open the page or give the Royal ID AND gives a reason, or points out " +
    "a red flag (for example the address is wrong, it's too good to be true, or they would check " +
    "the real shop instead).",
  fellForIt:
    "The player agrees to open the page, says they will enter or types a Royal ID, password or " +
    "code, or eagerly asks how to claim the crown.",
  neutral:
    "Small talk, questions about the Cat, or hesitation without a reason or a red flag.",
  keyEarnedWhen:
    "The player names the wrong/look-alike address as the problem, OR refuses to give the Royal ID " +
    "and clearly explains why (e.g. it's a password, the offer is too good to be true).",
  defaultLesson: "Check where a link really goes. A familiar name on the wrong address is a grin without a cat.",
  examples: [
    { player: "Ooh yes! How do I claim it? Show me the page!", judgement: "fell_for_it, −20, no key" },
    { player: "Sure, my Royal ID is crown42", judgement: "fell_for_it, −25, no key" },
    {
      player: "Yes! Here is my password: sunshine123",
      judgement: "fell_for_it, −25, no key, oversharedRealInfo true",
    },
    { player: "Why are you grinning?", judgement: "neutral, 0" },
    { player: "Hmm, I'm not sure…", judgement: "neutral, 0 (no reason given)" },
    {
      player: "That address isn't the Queen's real shop, I'm not clicking it",
      judgement: "resisted, +15, key earned, red flag: wrong address",
    },
    {
      player: "No, a Royal ID is like a password and free crowns sound too good to be true",
      judgement: "resisted, +20, key earned, red flags: asks for password, too good to be true",
    },
    { player: "No thanks.", judgement: "resisted, +5, no key (no reason given)" },
  ],
};
