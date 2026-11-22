/**
 * File: lib/lessons.ts
 * Purpose: The four one-line lessons (spec §1.1). One source for the Referee's default lesson
 *          and the ending summary card. Client-safe: no answers or hidden goals here.
 * Author: manasa
 * Date: 2026-11-21
 */
import type { KeyPieceType } from "./schemas";

export const LESSONS: Readonly<Record<KeyPieceType, string>> = {
  caterpillar: "You don't owe strangers your identity. A friendly voice can still be asking for too much.",
  cheshire: "Check where a link really goes. A familiar name on the wrong address is a grin without a cat.",
  hatter: "Confident isn't the same as correct. Check the source before you share.",
  queen: "Urgency is a red flag. Slow down, breathe, and check with someone you trust.",
};

export const GUIDE_LESSON = "Even AI can be tricked, so verify your guide too.";
