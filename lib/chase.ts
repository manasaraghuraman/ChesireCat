import levels from "../chase/src/config/levels.json";

export type ChaseLevel = keyof typeof levels;
export const chaseLevels = Object.keys(levels) as ChaseLevel[];

export interface ChaseChoice {
  readonly choice: "next" | "hall";
  readonly completed: boolean;
}

export function chaseChoice(data: unknown, activeLevel: ChaseLevel): ChaseChoice | null {
  if (typeof data !== "object" || data === null) return null;
  const { source, choice, level, completed } = data as Record<string, unknown>;
  if (source !== "carbon-chase" || level !== activeLevel || typeof completed !== "boolean") return null;
  if (choice !== "hall" && (choice !== "next" || !completed)) return null;
  return { choice, completed };
}

export function nextChaseLevel(level: ChaseLevel): ChaseLevel | null {
  return chaseLevels[chaseLevels.indexOf(level) + 1] ?? null;
}
