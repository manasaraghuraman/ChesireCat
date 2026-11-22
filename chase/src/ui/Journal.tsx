import { useState } from "preact/hooks";
import { Leaderboard } from "./Leaderboard";
import { courses, type LevelId } from "../config/courses";
import type { LocalSave } from "../save/localSave";
import type { Course } from "../core/training";
export function LevelSelect({
  save,
  start,
  ready,
}: {
  save: LocalSave;
  start: (course: Course) => void;
  ready: boolean;
}) {
  const [board, setBoard] = useState<LevelId | null>(null);
  return (
    <>
      <h2>Choose a level</h2>
      {courses.map((c) => {
        const r = save.record(c.id);
        return (
          <article class="entry" key={c.id}>
            <div>
              <h3>{c.name}</h3>
              <small>
                {r.best === null
                  ? "First run"
                  : r.best.toFixed(3) + " s · " + r.medal}
                {r.glove ? " · Glove found" : ""}
              </small>
            </div>
            <button
              class="secondary"
              onClick={() => setBoard(board === c.id ? null : c.id)}
            >
              Times
            </button>
            <button disabled={!ready} onClick={() => start(c.course)}>
              Play {c.name}
            </button>
          </article>
        );
      })}
      {board && <Leaderboard id={board} race={() => start(board)} />}
      <button
        class="secondary"
        disabled={!ready}
        onClick={() => start("training")}
      >
        Movement test room
      </button>
    </>
  );
}
export function Tips({ save }: { save: LocalSave }) {
  return (
    <>
      <h2>The Rabbit’s tips</h2>
      {courses.map((c) => (
        <article class="entry" key={c.id}>
          <div>
            <h3>{c.name}</h3>
            <p>
              {save.record(c.id).glove
                ? (c.tip ?? "Glove found · Impact data coming soon")
                : "Find the Rabbit’s lost glove to unlock this card."}
            </p>
          </div>
        </article>
      ))}
    </>
  );
}
