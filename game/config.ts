/**
 * File: game/config.ts
 * Purpose: Builds the Phaser game configuration and scene list.
 * Author: manasa
 * Date: 2026-11-21 (updated: all scenes)
 */
import * as Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../lib/constants";
import { CaterpillarScene } from "./scenes/Caterpillar";
import { CheshireScene } from "./scenes/Cheshire";
import { FallScene } from "./scenes/Fall";
import { GardenScene } from "./scenes/Garden";
import { HallOfDoorsScene } from "./scenes/HallOfDoors";
import { HatterScene } from "./scenes/Hatter";
import { QueenScene } from "./scenes/Queen";
import { TrialScene } from "./scenes/Trial";

export function createGameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: "#2a1a4a",
    scene: [
      FallScene,
      HallOfDoorsScene,
      CaterpillarScene,
      CheshireScene,
      HatterScene,
      QueenScene,
      TrialScene,
      GardenScene,
    ],
  };
}
