/**
 * File: game/config.ts
 * Purpose: Builds the Phaser game configuration and scene list.
 * Author: manasa
 * Date: 2026-11-21
 */
import * as Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../lib/constants";
import { FallScene } from "./scenes/Fall";
import { HallOfDoorsScene } from "./scenes/HallOfDoors";

export function createGameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: "#2a1a4a",
    scene: [FallScene, HallOfDoorsScene],
  };
}
