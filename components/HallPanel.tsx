/**
 * File: components/HallPanel.tsx
 * Purpose: React UI under the Hall of Doors hub: the White Rabbit's welcome, the link checker, the
 *          Bottles, and Looking-Glass mode once the game is won.
 * Author: manasa
 * Date: 2026-11-21
 */
"use client";

import { requiredKeys } from "@/lib/progress";
import { useGameStore } from "@/lib/state/store";
import BottleShelf from "./BottleShelf";
import LinkChecker from "./LinkChecker";
import LookingGlass from "./LookingGlass";
import RabbitBubble from "./RabbitBubble";

const WELCOME =
  "Oh my ears and whiskers, I'm so sorry about that pop-up! I was late, you see. Collect the key pieces from the " +
  "characters behind the doors, then open the tiny garden door at the top. I'll guide you.";

export default function HallPanel() {
  const keys = useGameStore((s) => s.keys);
  const hasWon = useGameStore((s) => s.hasWon);
  const missing = requiredKeys().filter((piece) => !keys.includes(piece));
  const progress =
    missing.length === 0
      ? "You have every key piece you need. Open the garden door!"
      : `Still needed: ${missing.join(", ")}.`;

  return (
    <div className="flex w-full max-w-[800px] flex-col gap-3">
      <RabbitBubble text={`${WELCOME} ${progress}`} />
      <LinkChecker />
      <BottleShelf />
      {hasWon && <LookingGlass />}
    </div>
  );
}
