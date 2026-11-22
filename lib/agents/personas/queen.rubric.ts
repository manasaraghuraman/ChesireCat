/**
 * File: lib/agents/personas/queen.rubric.ts
 * Purpose: Referee rubric for the Queen of Hearts (pressure scams) level.
 * Author: manasa
 * Date: 2026-11-21
 */
import { LESSONS } from "../../lessons";
import type { Rubric } from "./shared";

export const QUEEN_RUBRIC: Rubric = {
  level: "queen",
  redFlags: [
    "a fake deadline or countdown (pay within two minutes)",
    "threats if you don't act immediately",
    "claims of authority ('by royal decree') to scare you",
    "asking for money or a password on a page you were rushed to open",
  ],
  resisted:
    "The player refuses to pay or click under pressure, AND names urgency, threats or fake authority " +
    "as the problem, or says they would slow down and check with a trusted adult.",
  fellForIt:
    "The player agrees to pay, asks how to pay quickly, gives a password or code, or panics and complies.",
  neutral: "Questions, jokes, or hesitation without naming a red flag.",
  keyEarnedWhen:
    "the player names urgency, the deadline, threats or fake authority as the red flag (or says they " +
    "would slow down and check first).",
  defaultLesson: LESSONS.queen,
  examples: [
    { player: "Okay okay, how do I pay?! Please don't!", judgement: "fell_for_it, −20, no key" },
    { player: "Here's my bank password: sunshine123", judgement: "fell_for_it, −25, oversharedRealInfo true" },
    { player: "What fine?", judgement: "neutral, 0" },
    { player: "No. I'm not paying anything.", judgement: "resisted, +5, no key (no red flag named)" },
    {
      player: "You're rushing me with a two-minute deadline and threats. That's a scam tactic, so I'm slowing down.",
      judgement: "resisted, +20, key earned, red flags: fake deadline, threats",
    },
  ],
};
