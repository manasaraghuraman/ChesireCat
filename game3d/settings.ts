/**
 * File: game3d/settings.ts
 * Purpose: Player comfort settings (mouse sensitivity, FOV, invert-Y, reduced motion), clamped and
 *          saved to localStorage under a key separate from the game state's STORAGE_KEY.
 *          Persistence pattern adapted from carbon-footprint game src/save/localSave.ts.
 * Date: 2026-11-21
 */
import { EXPLORE_MOVEMENT } from "./config";

export const SETTINGS_KEY = "rabbit-hole-settings-v1";

export const SETTINGS_LIMITS = {
  mouseSensitivity: { min: 0.0005, max: 0.008 },
  fov: { min: 70, max: 100 },
} as const;

export interface Settings {
  readonly mouseSensitivity: number;
  readonly fov: number;
  readonly invertY: boolean;
  readonly reducedMotion: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  mouseSensitivity: EXPLORE_MOVEMENT.mouseSensitivity,
  fov: EXPLORE_MOVEMENT.fov,
  invertY: false,
  reducedMotion: false,
};

function bounded(value: unknown, limits: { readonly min: number; readonly max: number }, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(limits.max, Math.max(limits.min, value)) : fallback;
}

/** Coerces anything (e.g. a stale or hand-edited saved value) into valid settings. */
export function cleanSettings(raw: unknown): Settings {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    mouseSensitivity: bounded(o.mouseSensitivity, SETTINGS_LIMITS.mouseSensitivity, DEFAULT_SETTINGS.mouseSensitivity),
    fov: bounded(o.fov, SETTINGS_LIMITS.fov, DEFAULT_SETTINGS.fov),
    invertY: o.invertY === true,
    reducedMotion: o.reducedMotion === true,
  };
}

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function loadSettings(storage: StorageLike | undefined): Settings {
  try {
    const raw = storage?.getItem(SETTINGS_KEY);
    return cleanSettings(raw ? JSON.parse(raw) : {});
  } catch {
    return DEFAULT_SETTINGS; // blocked storage or bad JSON
  }
}

export function saveSettings(storage: StorageLike | undefined, settings: Settings): Settings {
  const clean = cleanSettings(settings);
  try {
    storage?.setItem(SETTINGS_KEY, JSON.stringify(clean));
  } catch {
    // Private mode or full storage: keep the in-memory value.
  }
  return clean;
}
