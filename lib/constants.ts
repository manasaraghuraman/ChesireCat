/**
 * File: lib/constants.ts
 * Purpose: Named game constants shared by the store, HUD, and Phaser scenes.
 * Author: manasa
 * Date: 2026-11-21
 */
export const SIZE_MIN = 0;
export const SIZE_MAX = 100;
export const SIZE_START = 60;
export const SIZE_TOO_SMALL = 25;
export const REWINDS_PER_LEVEL = 3;
export const STORAGE_KEY = "rabbit-hole-state-v1";

export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 500;

export const KEY_PIECES = ["caterpillar", "cheshire", "hatter", "queen"] as const;
export const LEVEL_IDS = ["fall", "caterpillar", "cheshire", "hatter", "queen", "trial"] as const;

export const SCENE_FALL = "Fall";
export const SCENE_HALL = "HallOfDoors";
export const SCENE_CHESHIRE = "Cheshire";
export const SCENE_MAZE = "Maze";
export const SCENE_CLUES = "Clues";
export const SCENE_GARDEN = "Garden";

/** Size change ranges the Referee's sizeDelta is clamped to, by outcome (spec §3.1). */
export const SIZE_DELTA_RESISTED = { min: 5, max: 20 } as const;
export const SIZE_DELTA_FELL = { min: -25, max: -15 } as const;
export const SIZE_DELTA_NEUTRAL = { min: -5, max: 5 } as const;

/** Dialogue limits for /api/npc/*. */
export const NPC_MAX_TURNS = 20;
export const NPC_MAX_TEXT = 500;
/** How many recent turns the NPC and Referee see. */
export const NPC_CONTEXT_TURNS = 8;
export const NPC_RATE_LIMIT_PER_MINUTE = 20;

/** The three key pieces that open the garden in this build (Cheshire signposts, News Maze, Clue Room). */
export const GARDEN_KEYS = ["cheshire", "caterpillar", "hatter"] as const;
