/**
 * File: lib/bottles.ts
 * Purpose: "Drink Me / Eat Me" bottles (spec §3.5): downloads and attachments. Inspecting a bottle's
 *          file name, source and size before using it is rewarded; using a bad one shows a harmless
 *          pretend "your files are locked!" screen. Named "Bottles" in the UI, not "Size".
 * Author: manasa
 * Date: 2026-11-21
 */
export interface Bottle {
  readonly id: string;
  readonly label: "DRINK ME" | "EAT ME";
  readonly fileName: string;
  readonly source: string;
  readonly sizeKilobytes: number;
  readonly isSafe: boolean;
  readonly explanation: string;
}

export const BOTTLE_INSPECT_BONUS = 5;
export const BOTTLE_BAD_USED_PENALTY = -10;
export const BOTTLE_SAFE_USED_REWARD = 5;

export const BOTTLES: readonly Bottle[] = [
  {
    id: "homework-notes",
    label: "EAT ME",
    fileName: "maths-notes.pdf",
    source: "Your teacher's class page (hearts-school.wonder)",
    sizeKilobytes: 240,
    isSafe: true,
    explanation: "A plain document, from a source you know, with a sensible size.",
  },
  {
    id: "free-game",
    label: "DRINK ME",
    fileName: "FREE-GAME-CRACK-installer.exe",
    source: "A pop-up on tarts-for-free.wonder",
    sizeKilobytes: 48000,
    isSafe: false,
    explanation: "Programs (.exe) from random pop-ups are a classic way to sneak in malware.",
  },
  {
    id: "invoice",
    label: "EAT ME",
    fileName: "invoice-URGENT.pdf.scr",
    source: "An email from 'The Queen's Accounts' you weren't expecting",
    sizeKilobytes: 920,
    isSafe: false,
    explanation: "A double extension (.pdf.scr) hides a program pretending to be a document.",
  },
  {
    id: "photo",
    label: "DRINK ME",
    fileName: "tea-party-photo.jpg",
    source: "Sent by a friend you were just chatting with",
    sizeKilobytes: 1800,
    isSafe: true,
    explanation: "A picture from someone you know, expected, and a normal size.",
  },
];

export interface BottleOutcome {
  readonly sizeDelta: number;
  readonly message: string;
  readonly isLockedScreen: boolean;
}

export function resolveBottle(
  bottle: Bottle,
  choice: { readonly hasInspected: boolean; readonly isUsing: boolean },
): BottleOutcome {
  const bonus = choice.hasInspected ? BOTTLE_INSPECT_BONUS : 0;
  if (choice.isUsing && !bottle.isSafe) {
    return { sizeDelta: BOTTLE_BAD_USED_PENALTY, isLockedScreen: true, message: bottle.explanation };
  }
  if (choice.isUsing) {
    return { sizeDelta: BOTTLE_SAFE_USED_REWARD + bonus, isLockedScreen: false, message: bottle.explanation };
  }
  const isGoodCall = !bottle.isSafe;
  return {
    sizeDelta: isGoodCall ? BOTTLE_SAFE_USED_REWARD + bonus : 0,
    isLockedScreen: false,
    message: isGoodCall ? `Good call. ${bottle.explanation}` : `That one was actually fine. ${bottle.explanation}`,
  };
}
