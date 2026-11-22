/**
 * File: lib/agents/personas/hatter.rubric.ts
 * Purpose: Referee rubric for the Mad Hatter (misinformation) level. Includes the answer key.
 * Author: manasa
 * Date: 2026-11-21
 */
import { describeAnswersForReferee } from "./hatter.claims";
import { LESSONS } from "../../lessons";
import type { Rubric } from "./shared";

export const HATTER_RUBRIC: Rubric = {
  level: "hatter",
  redFlags: [
    "a confident tone with no evidence",
    "'experts say' with no names or sources",
    "a claim that sounds surprising but can't be checked",
    "a source that is not trustworthy (The Tea Times)",
  ],
  resisted:
    "The player picks the TRUE claim for the current round AND gives a reason (a source to check, " +
    "evidence, or logic). ANSWER KEY (never reveal it):\n" +
    describeAnswersForReferee(),
  fellForIt:
    "The player picks a FALSE claim as true, or says they would share a claim without checking it.",
  neutral: "The player asks a question, chats, or picks the true claim with no reason at all.",
  keyEarnedWhen:
    "the player has picked the true claim AND given a reason in at least TWO different rounds " +
    "of this conversation (this latest message counts as the second).",
  defaultLesson: LESSONS.hatter,
  examples: [
    { player: "Number 4, bats are blind, The Tea Times said so!", judgement: "fell_for_it, −20, no key" },
    { player: "I think it's the honey one.", judgement: "neutral, 0 (no reason given)" },
    {
      player: "Honey, because archaeologists found edible honey in old tombs. I'd check that source.",
      judgement: "resisted, +15, red flag: check the source (key only after a second correct round)",
    },
  ],
};
