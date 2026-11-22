/**
 * File: lib/trial/challenges.ts
 * Purpose: Trial rapid-fire round (spec §2 Act 3): one challenge per threat type, scored in code.
 *          Data-driven so designers can edit wording without touching logic.
 * Author: manasa
 * Date: 2026-11-21
 */
export type ThreatType = "privacy" | "phishing" | "misinformation" | "pressure";

export interface TrialChallenge {
  readonly threat: ThreatType;
  readonly prompt: string;
  readonly options: readonly string[];
  readonly correctIndex: number;
  readonly lesson: string;
}

export const TRIAL_PASS_MARK = 3;
export const TRIAL_SIZE_CORRECT = 5;
export const TRIAL_SIZE_WRONG = -10;

export const TRIAL_CHALLENGES: readonly TrialChallenge[] = [
  {
    threat: "privacy",
    prompt: "A juror asks: 'What's your full name, school and street? For the court records!'",
    options: ["Tell them, it's a court!", "Politely decline: strangers don't need that", "Give half now, half later"],
    correctIndex: 1,
    lesson: "You never owe strangers your identity.",
  },
  {
    threat: "phishing",
    prompt: "A card hands you a link: 'queensroyalshop.wonder.free-crowns.wonder: claim your prize!'",
    options: ["Click it, free prize!", "Check the real address: it's a look-alike", "Send it to friends first"],
    correctIndex: 1,
    lesson: "Check where a link really goes.",
  },
  {
    threat: "misinformation",
    prompt: "The Dormouse says, very confidently: 'Everyone knows teapots are older than the moon!'",
    options: ["Confident, so it's true", "Ask for a source and check it", "Share it, it sounds fun"],
    correctIndex: 1,
    lesson: "Confident isn't the same as correct.",
  },
  {
    threat: "pressure",
    prompt: "The Queen shouts: 'Hand over your gold within ONE MINUTE or off with your head!'",
    options: ["Pay at once!", "Slow down: urgency is a red flag", "Pay half to be safe"],
    correctIndex: 1,
    lesson: "Urgency is a red flag. Slow down.",
  },
];

export interface ChallengeResult {
  readonly isCorrect: boolean;
  readonly sizeDelta: number;
}

/** An out-of-range choice counts as wrong rather than throwing. */
export function answerChallenge(challenge: TrialChallenge, choiceIndex: number): ChallengeResult {
  const isCorrect = choiceIndex === challenge.correctIndex;
  return { isCorrect, sizeDelta: isCorrect ? TRIAL_SIZE_CORRECT : TRIAL_SIZE_WRONG };
}

export function hasPassedRound(correctCount: number): boolean {
  return correctCount >= TRIAL_PASS_MARK;
}
