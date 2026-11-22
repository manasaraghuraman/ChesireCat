/**
 * File: chase/src/net/online.ts
 * Purpose: Offline stand-in for the original Supabase leaderboard client. The carbon chase is embedded in
 *          the main game and never talks to a server, so every online feature reports "Offline" and the
 *          rest of the game falls back to local saves, exactly as it did without Supabase credentials.
 * Author: manasa
 * Date: 2026-11-22 (replaces the optional Supabase client; same exports)
 */
import type { LevelRun } from "../level/run";
import type { LevelId } from "../config/courses";
import type { Track } from "../replay/codec";

/** The one call shape other code uses; it never exists in this build. */
interface OnlineClient {
  functions: {
    invoke(
      name: string,
      options: { body: unknown },
    ): Promise<{ data: { line: string; tip: string } | null; error: unknown }>;
  };
}

/** Always null: there is no online backend in this build. */
export const online = null as OnlineClient | null;

let name = "";

export function displayName(): string {
  return name;
}

export function chooseName(value: string): void {
  name = value.trim().slice(0, 24);
}

export function identity(): Promise<string> {
  return Promise.reject(new Error("Offline"));
}

export let submission: Promise<boolean> = Promise.resolve(false);

/** Runs are never submitted; the local save keeps the personal best. */
export function submit(_run: LevelRun, _track: Track): void {
  submission = Promise.resolve(false);
}

export interface Row {
  player_id: string;
  place: number;
  display_name: string;
  final_time_ms: number;
  ghost_path: string;
}

export function scores(_id: LevelId): Promise<{ top: Row[]; own: Row | null }> {
  return Promise.reject(new Error("Offline"));
}

export const opponents = new Map<LevelId, Track>();

export function downloadGhost(_id: LevelId, _path: string): Promise<void> {
  return Promise.reject(new Error("Offline"));
}
