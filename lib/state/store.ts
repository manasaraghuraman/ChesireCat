/**
 * File: lib/state/store.ts
 * Purpose: Zustand game store (size, keys, rewinds, progress) persisted to localStorage.
 * Author: manasa
 * Date: 2026-11-21
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { REWINDS_PER_LEVEL, SIZE_MAX, SIZE_MIN, SIZE_START, SIZE_TOO_SMALL, STORAGE_KEY } from "../constants";
import { LEVEL_IDS } from "../constants";
import {
  GameState,
  type GameStateType,
  type KeyPieceType,
  type LevelIdType,
  type RefereeVerdictType,
} from "../schemas";

/** What happened when a Referee verdict was applied, for UI feedback. */
export interface VerdictOutcome {
  readonly sizeBefore: number;
  readonly sizeAfter: number;
  readonly keyAwarded: boolean;
  /** The key was earned but Alice is too small to reach it (spec §3.1). */
  readonly tooSmallForKey: boolean;
}

interface Actions {
  readonly changeSize: (delta: number) => void;
  readonly awardKey: (piece: KeyPieceType) => void;
  readonly useRewind: (level: LevelIdType) => boolean;
  readonly goToLevel: (level: LevelIdType) => void;
  readonly addLesson: (lesson: string) => void;
  readonly applyVerdict: (piece: KeyPieceType, verdict: RefereeVerdictType) => VerdictOutcome;
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
      applyVerdict: (piece, verdict) => {
        const { size: sizeBefore, keys, lessons } = get();
        const sizeAfter = clampSize(sizeBefore + verdict.sizeDelta);
        const canReachKey = sizeAfter >= SIZE_TOO_SMALL;
        const keyAwarded = verdict.keyEarned && canReachKey && !keys.includes(piece);
        set({
          size: sizeAfter,
          ...(keyAwarded ? { keys: [...keys, piece] } : {}),
          ...(keyAwarded && verdict.lesson ? { lessons: [...lessons, verdict.lesson] } : {}),
        });
        return { sizeBefore, sizeAfter, keyAwarded, tooSmallForKey: verdict.keyEarned && !canReachKey };
      },
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
