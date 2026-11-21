/**
 * File: lib/state/store.ts
 * Purpose: Zustand game store (size, keys, rewinds, progress) persisted to localStorage.
 * Author: manasa
 * Date: 2026-11-21
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { REWINDS_PER_LEVEL, SIZE_MAX, SIZE_MIN, SIZE_START, STORAGE_KEY } from "../constants";
import { LEVEL_IDS } from "../constants";
import { GameState, type GameStateType, type KeyPieceType, type LevelIdType } from "../schemas";

interface Actions {
  readonly changeSize: (delta: number) => void;
  readonly awardKey: (piece: KeyPieceType) => void;
  readonly useRewind: (level: LevelIdType) => boolean;
  readonly goToLevel: (level: LevelIdType) => void;
  readonly addLesson: (lesson: string) => void;
  readonly reset: () => void;
}

export type GameStore = GameStateType & Actions;

const clampSize = (value: number): number => Math.min(SIZE_MAX, Math.max(SIZE_MIN, value));

export const createInitialState = (): GameStateType => ({
  size: SIZE_START,
  keys: [],
  rewindsLeft: Object.fromEntries(LEVEL_IDS.map((id) => [id, REWINDS_PER_LEVEL])) as GameStateType["rewindsLeft"],
  rabbitCured: false,
  currentLevel: "fall",
  lessons: [],
});

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...createInitialState(),
      changeSize: (delta) => set((s) => ({ size: clampSize(s.size + delta) })),
      awardKey: (piece) =>
        set((s) => (s.keys.includes(piece) ? s : { keys: [...s.keys, piece] })),
      useRewind: (level) => {
        const left = get().rewindsLeft[level] ?? 0;
        if (left <= 0) return false;
        set((s) => ({ rewindsLeft: { ...s.rewindsLeft, [level]: left - 1 } }));
        return true;
      },
      goToLevel: (level) => set({ currentLevel: level }),
      addLesson: (lesson) => set((s) => ({ lessons: [...s.lessons, lesson] })),
      reset: () => set(createInitialState()),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      merge: (persisted, current) => {
        const parsed = GameState.safeParse(persisted);
        return parsed.success ? { ...current, ...parsed.data } : current;
      },
    },
  ),
);
