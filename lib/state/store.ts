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
  /** The key was earned, but the Cheshire level also needs the White Rabbit cured (Appendix A §7.2). */
  readonly heldForRabbit: boolean;
}

/** What happened when the Rabbit was cured. */
export interface CureOutcome {
  readonly keyAwarded: boolean;
  readonly piece: KeyPieceType | null;
  readonly lesson: string | null;
}

/** The level whose key piece also requires curing the White Rabbit ("…AND cures the Rabbit"). */
export const RABBIT_GATED_PIECE: KeyPieceType = "cheshire";

/** Session-only state (not persisted): a key earned before the cure, and the last rewind point. */
interface Transient {
  readonly heldKey: { readonly piece: KeyPieceType; readonly lesson: string | null } | null;
  /** Size before the last consequential choice, for "the Hatter's stopped clock". */
  readonly rewindPoint: number | null;
}

interface Actions {
  readonly changeSize: (delta: number) => void;
  readonly awardKey: (piece: KeyPieceType) => void;
  readonly useRewind: (level: LevelIdType) => boolean;
  readonly goToLevel: (level: LevelIdType) => void;
  readonly addLesson: (lesson: string) => void;
  readonly applyVerdict: (piece: KeyPieceType, verdict: RefereeVerdictType) => VerdictOutcome;
  /** Marks the Rabbit cured and awards a key held for it, if Alice can still reach the key. */
  readonly cureRabbit: () => CureOutcome;
  /** Spends a rewind to restore the size from before the last choice. False if none left or nothing to undo. */
  readonly rewind: (level: LevelIdType) => boolean;
  readonly reset: () => void;
}

export type GameStore = GameStateType & Transient & Actions;

const initialTransient = (): Transient => ({ heldKey: null, rewindPoint: null });

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
      ...initialTransient(),
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
        const { size: sizeBefore, keys, lessons, rabbitCured } = get();
        const sizeAfter = clampSize(sizeBefore + verdict.sizeDelta);
        const canReachKey = sizeAfter >= SIZE_TOO_SMALL;
        const isEarned = verdict.keyEarned && canReachKey && !keys.includes(piece);
        const heldForRabbit = isEarned && piece === RABBIT_GATED_PIECE && !rabbitCured;
        const keyAwarded = isEarned && !heldForRabbit;
        set({
          size: sizeAfter,
          rewindPoint: sizeAfter !== sizeBefore ? sizeBefore : get().rewindPoint,
          ...(keyAwarded ? { keys: [...keys, piece] } : {}),
          ...(keyAwarded && verdict.lesson ? { lessons: [...lessons, verdict.lesson] } : {}),
          ...(heldForRabbit ? { heldKey: { piece, lesson: verdict.lesson } } : {}),
        });
        return { sizeBefore, sizeAfter, keyAwarded, tooSmallForKey: verdict.keyEarned && !canReachKey, heldForRabbit };
      },
      cureRabbit: () => {
        const { heldKey, keys, lessons, size } = get();
        const canAward = heldKey !== null && size >= SIZE_TOO_SMALL && !keys.includes(heldKey.piece);
        set({
          rabbitCured: true,
          heldKey: canAward ? null : heldKey,
          ...(canAward && heldKey ? { keys: [...keys, heldKey.piece] } : {}),
          ...(canAward && heldKey?.lesson ? { lessons: [...lessons, heldKey.lesson] } : {}),
        });
        return canAward && heldKey
          ? { keyAwarded: true, piece: heldKey.piece, lesson: heldKey.lesson }
          : { keyAwarded: false, piece: null, lesson: null };
      },
      rewind: (level) => {
        const point = get().rewindPoint;
        if (point === null || !get().useRewind(level)) return false;
        set({ size: point, rewindPoint: null });
        return true;
      },
      reset: () => set({ ...createInitialState(), ...initialTransient() }),
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
