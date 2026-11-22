/**
 * File: components/PauseMenu.tsx
 * Purpose: Start / Esc menu over the 3D world: controls, comfort settings (sensitivity, FOV,
 *          invert-Y, reduced motion), resume, and back to the Hall (in a level).
 *          Shown whenever controls aren't captured, except right after a dialogue closes.
 * Date: 2026-11-21
 */
"use client";

import { emit } from "@/game/bridge";
import { SETTINGS_LIMITS } from "@/game3d/settings";
import { SCENE_CHESHIRE, SCENE_FALL, SCENE_MAZE, SCENE_CLUES } from "@/lib/constants";
import { useSettings } from "./useSettings";
import { useWorldUi } from "./useWorldUi";

/** Sensitivity is shown as 1–10 rather than radians per pixel. */
const SENSITIVITY_STEPS = 10;
const { min: SENS_MIN, max: SENS_MAX } = SETTINGS_LIMITS.mouseSensitivity;
const toStep = (value: number) => Math.round(1 + ((value - SENS_MIN) / (SENS_MAX - SENS_MIN)) * (SENSITIVITY_STEPS - 1));
const fromStep = (step: number) => SENS_MIN + ((step - 1) / (SENSITIVITY_STEPS - 1)) * (SENS_MAX - SENS_MIN);

function SettingsPanel() {
  const settings = useSettings((s) => s.settings);
  const update = useSettings((s) => s.update);
  return (
    <fieldset className="mb-5 flex flex-col gap-3 border-t border-white/15 pt-4 text-sm">
      <legend className="pr-2 font-semibold text-amber-200">Settings</legend>
      <label className="flex items-center justify-between gap-3">
        <span>Mouse sensitivity</span>
        <input
          type="range"
          min={1}
          max={SENSITIVITY_STEPS}
          value={toStep(settings.mouseSensitivity)}
          onChange={(e) => update({ mouseSensitivity: fromStep(Number(e.target.value)) })}
          className="w-32 accent-amber-400"
        />
      </label>
      <label className="flex items-center justify-between gap-3">
        <span>Field of view ({settings.fov}°)</span>
        <input
          type="range"
          min={SETTINGS_LIMITS.fov.min}
          max={SETTINGS_LIMITS.fov.max}
          value={settings.fov}
          onChange={(e) => update({ fov: Number(e.target.value) })}
          className="w-32 accent-amber-400"
        />
      </label>
      <label className="flex items-center justify-between gap-3">
        <span>Invert mouse Y</span>
        <input type="checkbox" checked={settings.invertY} onChange={(e) => update({ invertY: e.target.checked })} className="h-4 w-4 accent-amber-400" />
      </label>
      <label className="flex items-center justify-between gap-3">
        <span>Reduce motion</span>
        <input
          type="checkbox"
          checked={settings.reducedMotion}
          onChange={(e) => update({ reducedMotion: e.target.checked })}
          className="h-4 w-4 accent-amber-400"
        />
      </label>
    </fieldset>
  );
}

const CONTROLS: ReadonlyArray<readonly [string, string]> = [
  ["Mouse", "Look"],
  ["WASD / arrows", "Move"],
  ["Space", "Jump"],
  ["Shift (hold)", "Hurry"],
  ["E", "Talk · enter · pick up"],
  ["Esc", "Release mouse / pause"],
];

interface PauseMenuProps {
  readonly title?: string;
}

export default function PauseMenu({ title = "Down the Rabbit Hole" }: PauseMenuProps) {
  const { locked, started, dialogueOpen, awaitingClick, scene } = useWorldUi();
  // The Fall has its own pop-up; nothing to pause while loading.
  if (locked || dialogueOpen || awaitingClick || scene === null || scene === SCENE_FALL) return null;

  // emit() is synchronous, so the world requests pointer lock inside this click (a user gesture).
  const resume = () => emit("capture-request", null);
  const backToHall = scene === SCENE_CHESHIRE || scene === SCENE_MAZE || scene === SCENE_CLUES ? () => emit("exit-level", null) : null;

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4 font-sans">
      <div role="dialog" aria-labelledby="pause-title" className="w-full max-w-sm rounded-lg bg-black/80 p-6 text-amber-50 shadow-xl">
        <h2 id="pause-title" className="mb-1 text-xl font-bold text-amber-300">
          {started ? "Paused" : title}
        </h2>
        <p className="mb-4 text-sm text-amber-100/80">Click to look around.</p>
        <dl className="mb-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          {CONTROLS.map(([key, action]) => (
            <div key={key} className="contents">
              <dt className="font-mono text-amber-200">{key}</dt>
              <dd>{action}</dd>
            </div>
          ))}
        </dl>
        <SettingsPanel />
        <button
          type="button"
          onClick={resume}
          autoFocus
          className="w-full rounded bg-amber-400 px-4 py-2 font-semibold text-black hover:bg-amber-300"
        >
          {started ? "Resume" : "Start"}
        </button>
        {backToHall && started && (
          <button type="button" onClick={backToHall} className="mt-3 w-full text-sm text-amber-100 underline">
            ← Back to the Hall of Doors
          </button>
        )}
      </div>
    </div>
  );
}
