/**
 * File: components/useSettings.ts
 * Purpose: Client store for comfort settings (sensitivity, FOV, invert-Y, reduced motion),
 *          loaded from and saved to localStorage under SETTINGS_KEY (separate from game state).
 * Date: 2026-11-21
 */
"use client";

import { create } from "zustand";
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from "@/game3d/settings";

interface SettingsStore {
  readonly settings: Settings;
  readonly isLoaded: boolean;
  readonly load: () => void;
  readonly update: (change: Partial<Settings>) => void;
}

const storage = (): Storage | undefined => (typeof window === "undefined" ? undefined : window.localStorage);

export const useSettings = create<SettingsStore>()((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoaded: false,
  load: () => {
    if (!get().isLoaded) set({ settings: loadSettings(storage()), isLoaded: true });
  },
  update: (change) => set({ settings: saveSettings(storage(), { ...get().settings, ...change }) }),
}));
