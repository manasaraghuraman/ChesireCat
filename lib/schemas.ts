/**
 * File: lib/schemas.ts
 * Purpose: Zod schemas for game state; validates persisted data at the boundary.
 * Author: manasa
 * Date: 2026-11-21
 */
import { z } from "zod";
import { KEY_PIECES, LEVEL_IDS, SIZE_MAX, SIZE_MIN } from "./constants";

export const LevelId = z.enum(LEVEL_IDS);
export const KeyPiece = z.enum(KEY_PIECES);

export const GameState = z.object({
  size: z.number().min(SIZE_MIN).max(SIZE_MAX),
  keys: z.array(KeyPiece),
  rewindsLeft: z.record(LevelId, z.number()),
  rabbitCured: z.boolean(),
  currentLevel: LevelId,
  lessons: z.array(z.string()),
});

export type LevelIdType = z.infer<typeof LevelId>;
export type KeyPieceType = z.infer<typeof KeyPiece>;
export type GameStateType = z.infer<typeof GameState>;
