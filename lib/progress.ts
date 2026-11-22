/**
 * File: lib/progress.ts
 * Purpose: Which key pieces the Trial needs: all four normally, only the Cheshire key in demo
 *          mode (spec §3.2).
 * Author: manasa
 * Date: 2026-11-21
 */
import { DEMO_REQUIRED_KEYS, IS_DEMO_MODE, KEY_PIECES } from "./constants";
import type { KeyPieceType } from "./schemas";

export function requiredKeys(isDemoMode: boolean = IS_DEMO_MODE): readonly KeyPieceType[] {
  return isDemoMode ? DEMO_REQUIRED_KEYS : KEY_PIECES;
}

export function hasRequiredKeys(keys: readonly KeyPieceType[], isDemoMode: boolean = IS_DEMO_MODE): boolean {
  return requiredKeys(isDemoMode).every((piece) => keys.includes(piece));
}
