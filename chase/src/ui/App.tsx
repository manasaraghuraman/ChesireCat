/**
 * File: chase/src/ui/App.tsx
 * Purpose: The chase game's menus, HUD and results screen (vendored). Embed mode (see embed.ts) swaps the
 *          title menu, the end-of-level buttons and the pause "main menu" for the embedded variants.
 * Author: vgarg492 (original); manasa (embed mode)
 * Date: 2026-11-22
 */
import {
  carbonActions,
  carbonAmount,
  gasSource,
  gridSource,
} from "../config/carbon";
import { Commentary } from "./Commentary";
import { Leaderboard } from "./Leaderboard";
import { online, chooseName, displayName } from "../net/online";
import { useState } from "preact/hooks";
import { courses, medal } from "../config/courses";
import type { LocalSave, Settings as Values } from "../save/localSave";
import { Settings } from "./Settings";
import { LevelSelect, Tips } from "./Journal";
import { powers } from "../config/powers";
import type { Mode, Course } from "../core/training";
import type { LevelRun } from "../level/run";
import { ringTicks } from "../config/ring";
import { DT } from "../core/loop";
import { isEmbedded, requestedLevel } from "../embed";
import { EmbedChoices, EmbedStart, HallButton } from "./EmbedPanels";
interface Props {
  save: LocalSave;
  settings: Values;
  change: (v: Partial<Values>) => void;
  mode: Mode;
  speed: number;
  state: string;
  error: string;
  ready: boolean;
  run: LevelRun | null;
  start: (course?: Course) => void;
  title: () => void;
}
const time = (s: number) => s.toFixed(3) + " s";
export function App({
  save,
  settings,
  change,
  mode,
  speed,
  state,
  error,
  ready,
  run,
  start,
  title,
}: Props) {
  const [page, setPage] = useState<"menu" | "levels" | "settings" | "tips">(
    "menu",
  );
  const [name, setName] = useState(displayName()),
    [skipped, setSkipped] = useState(false);
  if (mode === "title" && online && !displayName() && !skipped)
    return (
      <form
        class="panel"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) chooseName(name);
          setSkipped(true);
        }}
      >
        <h2>Leaderboard name</h2>
        <label>
          Display name{" "}
          <input
            autoComplete="nickname"
            required
            maxLength={24}
            value={name}
            onInput={(e) => setName(e.currentTarget.value)}
          />
        </label>
        <div class="actions">
          <button>Save name</button>
          <button type="button" onClick={() => setSkipped(true)}>
            Play locally
          </button>
        </div>
      </form>
    );
  const embeddedLevel = isEmbedded ? requestedLevel() : null;
  if (embeddedLevel && mode === "title")
    return <EmbedStart level={embeddedLevel} ready={ready} error={error} start={start} />;
  const action = run?.actionAt(run.activeRing);
  const completion = run?.latestCompletion;
  const carbon = completion && carbonActions[completion.type];
  if (mode === "running")
    return (
      <>
        <div class="reticle" aria-hidden="true" />
        {run && (
          <aside class="runhud">
            <strong>{run.level.name}</strong>
            {run.gloveFound && <span>Glove found</span>}
            {run.hazards.inSmog && <span>Smog · 60% speed</span>}
            <b>{time(run.ticks * DT)}</b>
            {run.challenge ? (
              <>
                <label>
                  Cottage footprint · {run.footprintPoints} /{" "}
                  {run.challenge.start} points
                  <meter
                    min={0}
                    max={run.challenge.start}
                    low={run.challenge.target}
                    high={run.challenge.target}
                    optimum={0}
                    value={run.footprintPoints}
                  />
                </label>
                <span>
                  {run.exitOpen
                    ? "Rabbit hole open"
                    : `Find all actions · ${run.required - run.remaining} / ${run.required} complete`}
                </span>
              </>
            ) : (
              <span>
                {run.remaining
                  ? run.required -
                    run.remaining +
                    " / " +
                    run.required +
                    " carbon tasks complete"
                  : "Rabbit hole open"}
              </span>
            )}
            {run.power.id && (
              <span>
                {powers[run.power.id].icon} {powers[run.power.id].label} ·{" "}
                {(run.power.ticks * DT).toFixed(1)} s{" "}
                {run.power.id === "hatter_hop" &&
                  " · " + run.power.airJumps + " jumps"}
              </span>
            )}
            {action ? (
              <div class="footprint-action">
                <strong>
                  E / X · {action.label} · −{action.points}{" "}
                  {action.points === 1 ? "point" : "points"}
                </strong>
                <small>{action.why}</small>
              </div>
            ) : (
              run.activeRing >= 0 && (
                <label>
                  {run.level.leaks[run.activeRing].kind === "big" ||
                  run.level.leaks[run.activeRing].type === "light"
                    ? "Hold E · "
                    : "Press E · "}
                  {run.level.leaks[run.activeRing].type.replaceAll("_", " ")}{" "}
                  <progress
                    value={run.progress[run.activeRing]}
                    max={ringTicks}
                  />
                </label>
              )
            )}
          </aside>
        )}
        {completion && carbon && (
          <aside
            class="carbon-toast"
            role="status"
            key={completion.tick + ":" + completion.index}
          >
            <span>{carbon.label}</span>
            <strong>{carbonAmount(carbon)}</strong>
            <small>{carbon.example}</small>
          </aside>
        )}
        <aside class="hud">
          <strong>{speed.toFixed(1)} m/s</strong> · {state}
          {!document.pointerLockElement && " · Click game to capture mouse"}
        </aside>
      </>
    );
  const course = courses.find((c) => c.id === run?.level.id);
  const next = courses[courses.findIndex((c) => c === course) + 1];
  if (mode === "finished" && run && course)
    return (
      <section class="panel">
        <h2>{course.name} complete</h2>
        <strong class="medal">{medal(course.id, run.finalTime)}</strong>
        <h1>{time(run.finalTime)}</h1>
        <dl>
          <dt>Run time</dt>
          <dd>{time(run.ticks * DT)}</dd>
          {!run.challenge && (
            <>
              <dt>{run.hunt ? "Task time bonus" : "Optional time cut"}</dt>
              <dd>−{time(run.cut)}</dd>
            </>
          )}
          <dt>Personal best</dt>
          <dd>{time(save.record(course.id).best ?? run.finalTime)}</dd>
          <dt>{run.challenge ? "Actions taken" : "Leaks cleared"}</dt>
          <dd>
            {run.progress.filter((v) => v === ringTicks).length} /{" "}
            {run.progress.length}
          </dd>
        </dl>
        {run.challenge ? (
          <section class="footprint-recap">
            <h3>
              Cottage footprint · {run.challenge.start} → {run.footprintPoints}{" "}
              points
            </h3>
            <ul>
              {run.completedActions.map((completed, i) => (
                <li key={i}>
                  <strong>
                    {completed.label} · −{completed.points}
                  </strong>
                  <br />
                  {completed.why}
                </li>
              ))}
            </ul>
            <p>
              These are game points for this cottage. Generating electricity can
              release greenhouse gases. Real savings depend on how much
              electricity you avoid using and how it’s generated.
            </p>
            <p>
              <strong>Try it at home.</strong> Air-dry one load if you can. Ask
              someone you live with which appliance uses the most electricity
              and look up its energy label together.
            </p>
            <p>
              <a
                href="https://www.energy.gov/sites/prod/files/2022-08/energy-saver-guide-2022.pdf"
                target="_blank"
                rel="noreferrer"
              >
                U.S. Department of Energy home energy guide
              </a>
            </p>
          </section>
        ) : null}
        <section class="footprint-recap">
          <h3>Carbon savings examples</h3>
          <ul>
            {run.level.leaks.map((leak, i) => {
              const example = carbonActions[leak.type];
              return run.progress[i] === ringTicks && example ? (
                <li key={i}>
                  <strong>
                    {example.label} · {carbonAmount(example)}
                  </strong>
                  <br />
                  {example.example}
                </li>
              ) : null;
            })}
          </ul>
          <p>
            Electricity estimates use the U.S. average generation mix. Actual
            savings vary by device, usage, and local electricity supply.
          </p>
          <p>
            <a href={gridSource} target="_blank" rel="noreferrer">
              EPA electricity data
            </a>
            {" · "}
            <a href={gasSource} target="_blank" rel="noreferrer">
              EPA gasoline factor
            </a>
          </p>
        </section>
        <Commentary run={run} medal={medal(course.id, run.finalTime)} />
        <Leaderboard
          id={course.id}
          afterFinish
          race={() => start(course.course)}
        />
        {save.ghostIsSessionOnly(course.id) && (
          <p role="status">
            Browser storage is full. Your ghost is available for this session.
          </p>
        )}
        {!save.persistent && (
          <p role="status">Progress is available for this session only.</p>
        )}
        {isEmbedded ? (
          <EmbedChoices level={course.id} hasNext={Boolean(next)} />
        ) : (
          <div class="actions">
            <button onClick={() => start()}>Run again</button>
            {next && (
              <button onClick={() => start(next.course)}>
                Next · {next.name}
              </button>
            )}
            <button
              class="secondary"
              onClick={() => {
                title();
              }}
            >
              Main menu
            </button>
          </div>
        )}
      </section>
    );
  if (page !== "menu")
    return (
      <section class="panel">
        {page === "levels" ? (
          <LevelSelect ready={ready} save={save} start={start} />
        ) : page === "tips" ? (
          <Tips save={save} />
        ) : (
          <Settings values={settings} change={change} />
        )}
        {!save.persistent && (
          <p role="status">Progress is available for this session only.</p>
        )}
        <button class="secondary" onClick={() => setPage("menu")}>
          Back
        </button>
      </section>
    );
  return (
    <>
      <header>
        <span class="diamond">♦</span> Wonderland Arcade
      </header>
      <section class={mode === "paused" ? "panel" : "menu"}>
        <h1>
          {mode === "paused" ? (
            "Paused"
          ) : (
            <>
              Down the
              <br />
              <em>Rabbit Hole</em>
            </>
          )}
        </h1>
        <p>
          {mode === "paused"
            ? (run?.level.name ?? "Movement test room")
            : "Alice’s Cottage"}
          <br />
          {mode === "title" || run?.challenge
            ? "Search every room for carbon tasks. Tap E at a Lights Out action to complete it."
            : "Hold E for 3 seconds at lights and inside appliance rings."}
          <br />
          WASD to run · Mouse to look · Space to jump
          <br />
          Shift or Ctrl to slide · R to restart · Esc to pause
          <br />
          Controller: A jump · B slide · X interact · Y restart · Start pause
        </p>
        {error && <p role="alert">{error}</p>}
        <div class="actions">
          <button disabled={!ready} onClick={() => start()}>
            {!ready
              ? "Loading room…"
              : mode === "paused"
                ? "Resume"
                : "Play Lights Out"}
          </button>
          {mode === "title" && (
            <button class="secondary" onClick={() => setPage("levels")}>
              Level select
            </button>
          )}
          <button class="secondary" onClick={() => setPage("settings")}>
            Settings
          </button>
          <button class="secondary" onClick={() => setPage("tips")}>
            Tips
          </button>
          {mode === "paused" &&
            (embeddedLevel ? (
              <HallButton level={embeddedLevel} />
            ) : (
              <button class="secondary" onClick={title}>
                Main menu
              </button>
            ))}
        </div>
      </section>
      <footer aria-hidden="true">♠ ♥ ♣ ♦</footer>
    </>
  );
}
