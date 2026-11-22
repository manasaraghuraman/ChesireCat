/**
 * File: lib/agents/personas/index.ts
 * Purpose: Registry of playable NPC levels (persona + rubric). Server-only.
 * Author: manasa
 * Date: 2026-11-21 (updated: all four trials)
 */
import { CATERPILLAR } from "./caterpillar";
import { CATERPILLAR_RUBRIC } from "./caterpillar.rubric";
import { CHESHIRE } from "./cheshire";
import { CHESHIRE_RUBRIC } from "./cheshire.rubric";
import { HATTER } from "./hatter";
import { HATTER_RUBRIC } from "./hatter.rubric";
import { QUEEN } from "./queen";
import { QUEEN_RUBRIC } from "./queen.rubric";
import type { Persona, Rubric } from "./shared";

export interface NpcLevel {
  readonly persona: Persona;
  readonly rubric: Rubric;
}

const LEVELS: Readonly<Record<string, NpcLevel>> = {
  caterpillar: { persona: CATERPILLAR, rubric: CATERPILLAR_RUBRIC },
  cheshire: { persona: CHESHIRE, rubric: CHESHIRE_RUBRIC },
  hatter: { persona: HATTER, rubric: HATTER_RUBRIC },
  queen: { persona: QUEEN, rubric: QUEEN_RUBRIC },
};

export function getNpcLevel(id: string): NpcLevel | undefined {
  return Object.hasOwn(LEVELS, id) ? LEVELS[id] : undefined;
}
