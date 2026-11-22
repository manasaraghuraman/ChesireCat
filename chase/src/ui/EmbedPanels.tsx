/**
 * File: chase/src/ui/EmbedPanels.tsx
 * Purpose: The few screens that differ when the chase runs inside the main game: a start panel for the
 *          requested level, the two end-of-level choices (next level, or back to the Hall of Doors) and a
 *          "Back to the Hall" button. Choices go to the parent page through embed.ts.
 * Author: manasa
 * Date: 2026-11-22
 */
import { courses, type LevelId } from "../config/courses";
import type { Course } from "../core/training";
import { sendChoice } from "../embed";

export function HallButton({
  level,
  completed = false,
}: {
  level: LevelId;
  completed?: boolean;
}) {
  return (
    <button
      class="secondary"
      onClick={() => sendChoice("hall", level, completed)}
    >
      Back to the Hall of Doors
    </button>
  );
}

interface StartProps {
  level: LevelId;
  ready: boolean;
  error: string;
  start: (course?: Course) => void;
}

export function EmbedStart({ level, ready, error, start }: StartProps) {
  const name = courses.find((course) => course.id === level)?.name ?? level;
  return (
    <section class="panel">
      <h1>Chase the Rabbit!</h1>
      <h2>{name}</h2>
      <p>
        The White Rabbit rushed through the cottage and left lights and
        appliances running. Follow his trail, cut the energy waste, and open the
        rabbit hole.
        <br />
        WASD to run · Mouse to look · Space to jump · Shift or Ctrl to slide
        <br />
        Follow the on-screen E prompts · R to restart · Esc to pause
      </p>
      {error && <p role="alert">{error}</p>}
      <div class="actions">
        <button disabled={!ready} onClick={() => start(level)}>
          {ready ? "Start" : "Loading level…"}
        </button>
        <HallButton level={level} />
      </div>
    </section>
  );
}

/** The only two choices after a level: keep chasing, or go back to the Hall of Doors. */
export function EmbedChoices({
  level,
  hasNext,
}: {
  level: LevelId;
  hasNext: boolean;
}) {
  return (
    <div class="actions">
      <button onClick={() => sendChoice("next", level, true)}>
        {hasNext ? "Next level" : "Catch the Rabbit!"}
      </button>
      <HallButton level={level} completed />
    </div>
  );
}
