/**
 * File: lib/agents/personas/index.ts
 * Purpose: Registry of playable NPC levels (persona + rubric). Server-only.
 * Author: varenya
 * Date: 2026-11-21
 */
import { CHESHIRE } from "./cheshire";
import { CHESHIRE_RUBRIC } from "./cheshire.rubric";
import type { Persona, Rubric } from "./shared";

export interface NpcLevel {
  readonly persona: Persona;
  readonly rubric: Rubric;
}

const LEVELS: Readonly<Record<string, NpcLevel>> = {
  cheshire: { persona: CHESHIRE, rubric: CHESHIRE_RUBRIC },
};

export function getNpcLevel(id: string): NpcLevel | undefined {
  return Object.hasOwn(LEVELS, id) ? LEVELS[id] : undefined;
}
