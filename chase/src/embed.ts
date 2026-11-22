/**
 * File: chase/src/embed.ts
 * Purpose: Embed mode for when the chase runs inside the main game's iframe: which level to play, and a
 *          typed message channel to the parent page (same origin only) for the two end-of-level choices.
 * Author: manasa
 * Date: 2026-11-22
 */
import { courses, type LevelId } from "./config/courses";

export type ChaseChoice = "next" | "hall";

export interface ChaseMessage {
  readonly source: "carbon-chase";
  readonly choice: ChaseChoice;
  readonly level: LevelId;
  readonly completed: boolean;
}

export const isEmbedded =
  new URLSearchParams(window.location.search).has("embed") &&
  window.parent !== window;

/** The level the parent asked for (?level=...), validated against the real course list. */
export function requestedLevel(
  search: string = window.location.search,
): LevelId | null {
  const id = new URLSearchParams(search).get("level");
  return courses.find((course) => course.id === id)?.id ?? null;
}

/** Tells the parent page what the player chose. Only the same origin can receive it. */
export function sendChoice(
  choice: ChaseChoice,
  level: LevelId,
  completed = false,
): void {
  const message: ChaseMessage = {
    source: "carbon-chase",
    choice,
    level,
    completed,
  };
  window.parent.postMessage(message, window.location.origin);
}
