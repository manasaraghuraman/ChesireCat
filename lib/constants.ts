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
