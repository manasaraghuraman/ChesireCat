/**
 * File: lib/constants.ts
 * Purpose: Named game constants shared by the store, HUD, and Phaser scenes.
 * Author: manasa
 * Date: 2026-11-21 (updated: all scenes, rate limits, session, demo mode)
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
export const SCENE_CATERPILLAR = "Caterpillar";
export const SCENE_HATTER = "Hatter";
export const SCENE_QUEEN = "Queen";
export const SCENE_TRIAL = "Trial";
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

/** Demo path (spec §3.2): only the Cheshire key is needed to reach the Trial. */
export const IS_DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
export const DEMO_REQUIRED_KEYS = ["cheshire"] as const;

/** Rate limits per client per minute for the other API routes. */
export const RABBIT_RATE_LIMIT_PER_MINUTE = 10;
export const LINKCHECK_RATE_LIMIT_PER_MINUTE = 6;
export const SESSION_RATE_LIMIT_PER_MINUTE = 10;
export const LOOKING_GLASS_RATE_LIMIT_PER_MINUTE = 10;

/** Game session handling (spec §5, §12). */
export const MAX_LIVE_SESSIONS = 100;
export const SESSION_SWEEP_INTERVAL_MS = 60_000;

/** Link checker and Looking-Glass limits. */
export const LINK_URL_MAX_LENGTH = 2048;
export const SCAM_TEXT_MAX_LENGTH = 800;
export const CURE_TEXT_MAX_LENGTH = 400;

/** Alice's line at the Trial climax (Lewis Carroll, 1865, public domain). */
export const PACK_OF_CARDS_LINE = "You're nothing but a pack of cards!";
