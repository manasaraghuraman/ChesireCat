/**
 * File: lib/agents/personas/caterpillar.rubric.ts
 * Purpose: Referee rubric for the Caterpillar (privacy) level.
 * Author: manasa
 * Date: 2026-11-21
 */
import { LESSONS } from "../../lessons";
import type { Rubric } from "./shared";

export const CATERPILLAR_RUBRIC: Rubric = {
  level: "caterpillar",
  redFlags: [
    "a stranger asking for your name, age, school, city or address",
    "flattery used to get you to share more",
    "asking for one small detail at a time",
    "no good reason given for why the information is needed",
  ],
  resisted:
    "The player declines to share identifying information, OR asks why the Caterpillar needs it, OR " +
    "gives a clearly made-up answer (a fake name like 'Bob the Builder' counts as protecting themselves).",
  fellForIt:
    "The player gives a real-looking full name, their age, school, city or address (even just one detail).",
  neutral: "Small talk, questions about the mushroom, or hesitation without refusing or sharing.",
  keyEarnedWhen:
    "the player has now declined or questioned the Caterpillar at least three times in this conversation, " +
    "OR clearly explains why a stranger doesn't need that information.",
  defaultLesson: LESSONS.caterpillar,
  examples: [
    { player: "My name is Emma Clarke, I'm 12", judgement: "fell_for_it, −20, no key, oversharedRealInfo true" },
    { player: "I go to Hillside Primary in Leeds", judgement: "fell_for_it, −25, oversharedRealInfo true" },
    { player: "Who are YOU?", judgement: "neutral, 0" },
    { player: "I'd rather not say.", judgement: "resisted, +5, no key unless refused three times" },
    {
      player: "Why do you need my name? I don't share that with strangers online.",
      judgement: "resisted, +15, key earned, red flag: no reason given / stranger asking",
    },
  ],
};
